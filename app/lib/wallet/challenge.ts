/**
 * QAP Wallet V1 — Spend Authorization Helper
 *
 * Implements the v2 spend flow: client requests a challenge from the server,
 * signs `op:params:nonce` with both ML-DSA-65 and SLH-DSA-SHAKE-256s, then
 * returns the signed envelope ready for the spend endpoint to consume.
 *
 * Backend's verify_quantum_challenge requires BOTH signatures.
 */

import { signHybrid } from "./wallet";
import { loadWallet } from "./storage";
import type { StoredWallet } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

interface ChallengeResponse {
  challenge_id: string;
  nonce: string;
  expires_at: string;
}

export interface SignedSpend {
  challenge_id: string;
  signature: string;        // ML-DSA-65, base64
  sphincs_signature: string; // SLH-DSA-SHAKE-256s, hex
}

/**
 * Fetches a challenge from the backend, signs it locally with both PQ keys,
 * and returns the three fields every gated spend endpoint expects.
 *
 * @param walletAddress - Spending wallet address (or vault id for vault flows)
 * @param operation - Operation name, e.g. "transfer", "redeem", "send-to-wallet"
 * @param paramsString - Stable string representation of the spend params
 *                       (must match what backend hashes for params_hash)
 * @param mnemonic - User's 24-word BIP39 mnemonic — used once, dropped immediately
 *
 * @returns Three fields to merge into the spend POST body
 */
export async function signedSpend(
  walletAddress: string,
  operation: string,
  paramsString: string,
  mnemonic: string
): Promise<SignedSpend> {
  // 1. Load the stored wallet (need the encrypted SK blobs)
  const wallet: StoredWallet | null = await loadWallet();
  if (!wallet) {
    throw new Error("No wallet found in browser storage. Restore from mnemonic first.");
  }

  // 2. Request a challenge from the server
  const challengeRes = await fetch(`${API_URL}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet_address: walletAddress,
      operation,
      params: paramsString,
    }),
  });

  if (!challengeRes.ok) {
    const errText = await challengeRes.text();
    throw new Error(`Challenge request failed: ${errText}`);
  }

  const challenge: ChallengeResponse = await challengeRes.json();

  // 3. Build the canonical signing message: op:params:nonce
  const message = new TextEncoder().encode(
    `${operation}:${paramsString}:${challenge.nonce}`
  );

  // 4. Sign with both ML-DSA-65 and SLH-DSA-SHAKE-256s
  const { dilithiumSig, sphincsSig } = await signHybrid(wallet, mnemonic, message);

  return {
    challenge_id: challenge.challenge_id,
    signature: dilithiumSig,
    sphincs_signature: sphincsSig,
  };
}
// --- Password-Unlock Spend Flow ---

/**
 * Same as signedSpend but uses password instead of mnemonic.
 * Password is used once to unwrap localEncKey, then localEncKey decrypts the PQ keys.
 *
 * Requires: a PasswordVault to exist in storage (set during wallet creation).
 */
export async function signedSpendWithPassword(
  walletAddress: string,
  operation: string,
  paramsString: string,
  password: string
): Promise<SignedSpend> {
  const { loadWallet, loadPasswordVault } = await import('./storage')
  const { unsealWithPassword } = await import('./password')
  const { signHybridWithLocalEncKey } = await import('./wallet')

  const wallet = await loadWallet()
  if (!wallet) throw new Error('No wallet found in browser storage. Restore from mnemonic first.')

  const pwdVault = await loadPasswordVault()
  if (!pwdVault) throw new Error('No password set for this wallet. Please set a password first.')

  // Unwrap the localEncKey using the password
  const localEncKey = await unsealWithPassword(pwdVault, password)

  try {
    // Request a challenge from the server
    const challengeRes = await fetch(`${API_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletAddress,
        operation,
        params: paramsString,
      }),
    })
    if (!challengeRes.ok) {
      const errText = await challengeRes.text()
      throw new Error(`Challenge request failed: ${errText}`)
    }
    const challenge: ChallengeResponse = await challengeRes.json()

    // Build canonical message
    const message = new TextEncoder().encode(`${operation}:${paramsString}:${challenge.nonce}`)

    // Sign with both PQ schemes using the unwrapped localEncKey
    const { dilithiumSig, sphincsSig } = await signHybridWithLocalEncKey(wallet, localEncKey, message)

    return {
      challenge_id: challenge.challenge_id,
      signature: dilithiumSig,
      sphincs_signature: sphincsSig,
    }
  } finally {
    localEncKey.fill(0)
  }
}
