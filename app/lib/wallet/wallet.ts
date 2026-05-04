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
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
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
const TAPROOT_DERIVATION_PATH = "m/44'/0'/0'/0/0";

// ─── Wallet Creation ──────────────────────────────────────────────────────────

export async function createWallet(): Promise<QAPWallet> {
  const mnemonic = generateMnemonic(wordlist, 256);
  const bip39Seed = mnemonicToSeedSync(mnemonic);
  const seeds = await deriveKeySeeds(bip39Seed);
  const { taprootPrivKey, taprootPubKey } = deriveTaprootKey(seeds.taprootSeed);
  const { kyberPubKey, kyberSecKey } = await generateKyberKeypair();
  const { dilithiumPubKey, dilithiumSecKey } = generateDilithiumKeypair(seeds.dilithiumSeed);

  const [kyber_sk_enc, dilithium_sk_enc, taproot_sk_enc] = await Promise.all([
    encrypt(kyberSecKey, seeds.localEncKey),
    encrypt(dilithiumSecKey, seeds.localEncKey),
    encrypt(taprootPrivKey, seeds.localEncKey),
  ]);

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

  seeds.kyberSeed.fill(0);
  seeds.dilithiumSeed.fill(0);
  seeds.taprootSeed.fill(0);
  seeds.localEncKey.fill(0);

  return {
    mnemonic,
    address,
    publicKeys,
    encrypted,
    version: "QAP-WALLET-V1",
    createdAt: Date.now(),
  };
}

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

export async function restoreWallet(mnemonic: string): Promise<WalletRestoreResult> {
  if (!validateMnemonic(mnemonic, wordlist)) {
    return { success: false, error: "Invalid mnemonic phrase" };
  }

  try {
    const bip39Seed = mnemonicToSeedSync(mnemonic.trim());
    const seeds = await deriveKeySeeds(bip39Seed);
    const stored = await loadWallet();

    if (stored) {
      const { taprootPrivKey, taprootPubKey } = deriveTaprootKey(seeds.taprootSeed);
      const derivedAddress = await taprootPubKeyToAddress(taprootPubKey);

      if (derivedAddress !== stored.address) {
        seeds.localEncKey.fill(0);
        seeds.taprootSeed.fill(0);
        return { success: false, error: "Mnemonic does not match stored wallet" };
      }

      try {
        await decrypt(stored.encrypted.taproot_sk, seeds.localEncKey);
      } catch {
        seeds.localEncKey.fill(0);
        return { success: false, error: "Decryption failed — wrong mnemonic or corrupted storage" };
      }

      seeds.taprootSeed.fill(0);
      seeds.localEncKey.fill(0);

      return {
        success: true,
        wallet: {
          mnemonic,
          address: stored.address,
          publicKeys: stored.publicKeys,
          encrypted: stored.encrypted,
          version: stored.version,
          createdAt: stored.createdAt,
        },
      };
    }

    const { taprootPrivKey, taprootPubKey } = deriveTaprootKey(seeds.taprootSeed);
    const address = await taprootPubKeyToAddress(taprootPubKey);
    const { kyberPubKey, kyberSecKey } = await generateKyberKeypair();
    const { dilithiumPubKey, dilithiumSecKey } = generateDilithiumKeypair(seeds.dilithiumSeed);

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
          isStub: true,
        };
      } finally {
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
  // Real ML-DSA-65 (FIPS 204 / Dilithium3) keypair via @noble/post-quantum.
  // Deterministic: same seed always produces the same keypair.
  // PK: 1952 bytes, SK: 4032 bytes, signature: 3309 bytes.
  const seed32 = dilithiumSeed.slice(0, 32);
  const { publicKey, secretKey } = ml_dsa65.keygen(seed32);
  return {
    dilithiumPubKey: new Uint8Array(publicKey),
    dilithiumSecKey: new Uint8Array(secretKey),
  };
}

async function taprootPubKeyToAddress(pubKey: Uint8Array): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', pubKey.buffer as ArrayBuffer);
  const hash = new Uint8Array(hashBuf);
  const hashHex = toHex(hash);
  return `ubtc${hashHex.slice(0, 24)}`;
}