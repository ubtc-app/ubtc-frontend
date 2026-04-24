/**
 * QAP Wallet V1 — Wallet Creation & Restoration
 *
 * This is the primary entry point for all wallet operations.
 *
 * Security model:
 * - Mnemonic is shown ONCE and never stored by this module
 * - All secret keys are encrypted with localEncKey before storage
 * - localEncKey is derived from mnemonic — re-derived on restore
 * - Backend NEVER receives any private key material
 *
 * Key Share B stub:
 * - signWithKeyShareB() currently does local signing
 * - Future: replaced by FROST threshold signing via node network
 * - Interface is stable — swap implementation without changing callers
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { MlKem1024 } from "mlkem";
import * as secp256k1 from "@noble/secp256k1";

import { deriveKeySeeds, keyFingerprint } from "./hkdf";
import { encrypt, decrypt, toHex, fromHex } from "./encryption";
import { saveWallet, loadWallet } from "./storage";
import type {
  QAPWallet,
  StoredWallet,
  WalletRestoreResult,
  QAPPublicKeys,
  QAPEncryptedSecrets,
  KeyShareB,
  SigningRequest,
  PartialSignature,
} from "./types";

// BIP32 derivation path for QAP Taproot key
// m/44'/0'/0'/0/0
// 44' = purpose (BIP44)
// 0'  = coin type (Bitcoin)
// 0'  = account
// 0   = external chain
// 0   = first address
const TAPROOT_DERIVATION_PATH = "m/44'/0'/0'/0/0";

// ─── Wallet Creation ──────────────────────────────────────────────────────────

/**
 * Creates a brand new QAP wallet.
 *
 * Process:
 * 1. Generate BIP39 mnemonic (24 words = 256 bits entropy)
 * 2. Derive 64-byte BIP39 seed
 * 3. Derive key seeds via HKDF
 * 4. Generate Taproot key via BIP32
 * 5. Generate Kyber1024 keypair (random — see security note)
 * 6. Generate Dilithium3 keypair (random — see security note)
 * 7. Encrypt all secret keys with localEncKey
 * 8. Return wallet (caller must show mnemonic to user)
 *
 * Security note on Kyber/Dilithium:
 * These keypairs are generated with OS randomness (not deterministic).
 * The secret keys are encrypted with localEncKey (derived from mnemonic).
 * Restoring from mnemonic re-derives localEncKey and decrypts stored secrets.
 * True deterministic PQ key derivation requires upstream pqcrypto support.
 *
 * @returns QAPWallet — mnemonic is shown once, never stored here
 */
export async function createWallet(): Promise<QAPWallet> {
  // 1. Generate mnemonic — 24 words = 256 bits entropy
  const mnemonic = generateMnemonic(wordlist, 256);

  // 2. BIP39 seed — standard PBKDF2-SHA512, 2048 rounds
  const bip39Seed = mnemonicToSeedSync(mnemonic);

  // 3. Derive all key seeds via HKDF
  const seeds = await deriveKeySeeds(bip39Seed);

  // 4. Taproot key via BIP32
  const { taprootPrivKey, taprootPubKey } = deriveTaprootKey(seeds.taprootSeed);

  // 5. Kyber1024 keypair
  const { kyberPubKey, kyberSecKey } = await generateKyberKeypair();

  // 6. Dilithium3 keypair (placeholder — see note below)
  const { dilithiumPubKey, dilithiumSecKey } = generateDilithiumKeypair(
    seeds.dilithiumSeed
  );

  // 7. Encrypt all secret keys with localEncKey
  const [kyber_sk_enc, dilithium_sk_enc, taproot_sk_enc] = await Promise.all([
    encrypt(kyberSecKey, seeds.localEncKey),
    encrypt(dilithiumSecKey, seeds.localEncKey),
    encrypt(taprootPrivKey, seeds.localEncKey),
  ]);

  // 8. Derive wallet address from taproot public key
  const address = await taprootPubKeyToAddress(taprootPubKey);

  const publicKeys: QAPPublicKeys = {
    taproot: toHex(taprootPubKey),
    kyber: toHex(kyberPubKey),
    dilithium: toHex(dilithiumPubKey),
  };

  const encrypted: QAPEncryptedSecrets = {
    kyber_sk: kyber_sk_enc,
    dilithium_sk: dilithium_sk_enc,
    taproot_sk: taproot_sk_enc,
  };

  // Zero out sensitive seed material from memory
  seeds.kyberSeed.fill(0);
  seeds.dilithiumSeed.fill(0);
  seeds.taprootSeed.fill(0);
  // Note: localEncKey is needed for the encrypt calls above.
  // It is zeroed here — the encrypted blobs are already written.
  seeds.localEncKey.fill(0);

  return {
    mnemonic, // shown ONCE to user — not stored by this module
    address,
    publicKeys,
    encrypted,
    version: "QAP-WALLET-V1",
    createdAt: Date.now(),
  };
}

/**
 * Persists wallet to local storage (without mnemonic).
 * Call after createWallet() once user has confirmed mnemonic backup.
 */
export async function persistWallet(wallet: QAPWallet): Promise<void> {
  const stored: StoredWallet = {
    address: wallet.address,
    publicKeys: wallet.publicKeys,
    encrypted: wallet.encrypted,
    version: wallet.version,
    createdAt: wallet.createdAt,
  };
  await saveWallet(stored);
}

// ─── Wallet Restoration ───────────────────────────────────────────────────────

/**
 * Restores a wallet from mnemonic.
 *
 * Two restoration paths:
 * A. Device has stored encrypted secrets → re-derive localEncKey, decrypt
 * B. No stored secrets → re-derive localEncKey + Taproot key only
 *    (Kyber/Dilithium secrets are lost — new keypairs needed if B)
 *
 * Path A is the normal restore case (new device, same browser profile).
 * Path B requires re-generating Kyber/Dilithium and re-registering
 * public keys with the server — future flow, flagged in result.
 */
export async function restoreWallet(
  mnemonic: string
): Promise<WalletRestoreResult> {
  // Validate mnemonic before doing any work
  if (!validateMnemonic(mnemonic, wordlist)) {
    return { success: false, error: "Invalid mnemonic phrase" };
  }

  try {
    const bip39Seed = mnemonicToSeedSync(mnemonic.trim());
    const seeds = await deriveKeySeeds(bip39Seed);

    // Try to load stored wallet (Path A)
    const stored = await loadWallet();

    if (stored) {
      // Verify the mnemonic matches stored wallet by checking address
      const { taprootPrivKey, taprootPubKey } = deriveTaprootKey(
        seeds.taprootSeed
      );
      const derivedAddress = await taprootPubKeyToAddress(taprootPubKey);

      if (derivedAddress !== stored.address) {
        seeds.localEncKey.fill(0);
        seeds.taprootSeed.fill(0);
        return {
          success: false,
          error: "Mnemonic does not match stored wallet",
        };
      }

      // Verify we can decrypt stored secrets
      try {
        await decrypt(stored.encrypted.taproot_sk, seeds.localEncKey);
      } catch {
        seeds.localEncKey.fill(0);
        return {
          success: false,
          error: "Decryption failed — wrong mnemonic or corrupted storage",
        };
      }

      // Zero seeds — we have what we need
      seeds.taprootSeed.fill(0);
      seeds.localEncKey.fill(0);

      return {
        success: true,
        wallet: {
          mnemonic, // available during this session only
          address: stored.address,
          publicKeys: stored.publicKeys,
          encrypted: stored.encrypted,
          version: stored.version,
          createdAt: stored.createdAt,
        },
      };
    }

    // Path B — no stored secrets, rebuild what we can
    const { taprootPrivKey, taprootPubKey } = deriveTaprootKey(
      seeds.taprootSeed
    );
    const address = await taprootPubKeyToAddress(taprootPubKey);

    // New Kyber/Dilithium keypairs (old ones are lost)
    const { kyberPubKey, kyberSecKey } = await generateKyberKeypair();
    const { dilithiumPubKey, dilithiumSecKey } = generateDilithiumKeypair(
      seeds.dilithiumSeed
    );

    const [kyber_sk_enc, dilithium_sk_enc, taproot_sk_enc] = await Promise.all([
      encrypt(kyberSecKey, seeds.localEncKey),
      encrypt(dilithiumSecKey, seeds.localEncKey),
      encrypt(taprootPrivKey, seeds.localEncKey),
    ]);

    seeds.kyberSeed.fill(0);
    seeds.dilithiumSeed.fill(0);
    seeds.taprootSeed.fill(0);
    seeds.localEncKey.fill(0);

    const wallet: QAPWallet = {
      mnemonic,
      address,
      publicKeys: {
        taproot: toHex(taprootPubKey),
        kyber: toHex(kyberPubKey),
        dilithium: toHex(dilithiumPubKey),
      },
      encrypted: {
        kyber_sk: kyber_sk_enc,
        dilithium_sk: dilithium_sk_enc,
        taproot_sk: taproot_sk_enc,
      },
      version: "QAP-WALLET-V1",
      createdAt: Date.now(),
    };

    return { success: true, wallet };
  } catch (err) {
    return {
      success: false,
      error: `Restoration failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

// ─── Key Access (Session Only) ────────────────────────────────────────────────

/**
 * Decrypts and returns the Kyber secret key for this session.
 * Use for proof decryption. Zero the result after use.
 *
 * @param wallet - Active wallet session
 * @param mnemonic - User's mnemonic (to re-derive localEncKey)
 */
export async function getKyberSecretKey(
  wallet: QAPWallet | StoredWallet,
  mnemonic: string
): Promise<Uint8Array> {
  const bip39Seed = mnemonicToSeedSync(mnemonic);
  const seeds = await deriveKeySeeds(bip39Seed);
  const kyberSk = await decrypt(wallet.encrypted.kyber_sk, seeds.localEncKey);
  seeds.localEncKey.fill(0);
  return kyberSk;
}

/**
 * Decrypts and returns the Taproot private key for signing.
 * Zero the result immediately after signing.
 *
 * @param wallet - Active wallet session
 * @param mnemonic - User's mnemonic
 */
export async function getTaprootPrivKey(
  wallet: QAPWallet | StoredWallet,
  mnemonic: string
): Promise<Uint8Array> {
  const bip39Seed = mnemonicToSeedSync(mnemonic);
  const seeds = await deriveKeySeeds(bip39Seed);
  const taprootSk = await decrypt(wallet.encrypted.taproot_sk, seeds.localEncKey);
  seeds.localEncKey.fill(0);
  return taprootSk;
}

// ─── Key Share B Stub ─────────────────────────────────────────────────────────

/**
 * Key Share B — stub implementation for local signing.
 *
 * This interface is stable. When the QAP node network goes live,
 * swap this implementation for FROST threshold signing without
 * changing any callers.
 *
 * Current behaviour: signs locally with taproot private key.
 * Future behaviour: routes to node network, returns partial signature.
 */
export function createKeyShareBStub(
  wallet: QAPWallet | StoredWallet,
  mnemonic: string
): KeyShareB {
  return {
    async sign(request: SigningRequest): Promise<PartialSignature> {
      const taprootSk = await getTaprootPrivKey(wallet, mnemonic);

      try {
      const msgHashBuf = await crypto.subtle.digest('SHA-256', request.payload.buffer as ArrayBuffer);
const msgHash = new Uint8Array(msgHashBuf);
      const sig = await secp256k1.signAsync(msgHash, taprootSk);
const sigBytes = new Uint8Array(sig);
        return {
          signature: sigBytes,
          signerPublicKey: wallet.publicKeys.taproot,
          isStub: true, // flag: not yet threshold-signed
        };
      } finally {
        // Always zero private key after use
        taprootSk.fill(0);
      }
    },
  };
}

// ─── Internal Key Derivation ──────────────────────────────────────────────────

function deriveTaprootKey(taprootSeed: Uint8Array): {
  taprootPrivKey: Uint8Array;
  taprootPubKey: Uint8Array;
} {
  // Feed taprootSeed into BIP32 as root key material
  const root = HDKey.fromMasterSeed(taprootSeed);
  const child = root.derive(TAPROOT_DERIVATION_PATH);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("BIP32 derivation failed");
  }

  return {
    taprootPrivKey: child.privateKey,
    taprootPubKey: child.publicKey,
  };
}

async function generateKyberKeypair(): Promise<{
  kyberPubKey: Uint8Array;
  kyberSecKey: Uint8Array;
}> {
  // MlKem1024 = Kyber1024 (NIST ML-KEM standard)
  // Keypair is generated with OS randomness (CSPRNG)
  // Secret key is encrypted before storage — see createWallet()
  const kyber = new MlKem1024();
  const [kyberPubKey, kyberSecKey] = await kyber.generateKeyPair();

  return {
    kyberPubKey: new Uint8Array(kyberPubKey),
    kyberSecKey: new Uint8Array(kyberSecKey),
  };
}

function generateDilithiumKeypair(dilithiumSeed: Uint8Array): {
  dilithiumPubKey: Uint8Array;
  dilithiumSecKey: Uint8Array;
} {
  // Placeholder: Dilithium3 is implemented in the Rust backend.
  // In the browser, we use the seed to create a deterministic placeholder
  // until a WebAssembly Dilithium3 implementation is integrated.
  //
  // TODO: replace with @noble/post-quantum when available, or
  // compile pqcrypto-dilithium to WASM.
  //
  // For now: use secp256k1 as signing placeholder with dilithiumSeed.
  // The backend Dilithium3 keys remain the authoritative signing keys.
  const privKey = dilithiumSeed.slice(0, 32);
  const pubKey = secp256k1.getPublicKey(privKey, true);

  return {
    dilithiumPubKey: pubKey,
    dilithiumSecKey: new Uint8Array(dilithiumSeed), // full seed as placeholder
  };
}

async function taprootPubKeyToAddress(pubKey: Uint8Array): Promise<string> {
  // Derive a QAP wallet address from the taproot public key.
  // Format: "ubtc" + first 24 hex chars of SHA256(pubKey)
  // This matches the existing WLB address format.
 const hashBuf = await crypto.subtle.digest('SHA-256', pubKey.buffer as ArrayBuffer);
  const hash = new Uint8Array(hashBuf);
  const hashHex = toHex(hash);
  return `ubtc${hashHex.slice(0, 24)}`;
}
