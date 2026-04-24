/**
 * QAP Wallet — Password Protection Layer
 *
 * Wraps the wallet encryption with a user-chosen password.
 * Password never leaves the browser.
 * Mnemonic only needed for recovery on new device.
 *
 * Security model:
 * - Password → PBKDF2-SHA512 (310,000 rounds) → passwordKey
 * - passwordKey → AES-256-GCM encrypts the localEncKey
 * - localEncKey → AES-256-GCM encrypts Kyber SK
 * - Two-layer encryption: password + mnemonic
 */

import { encrypt, decrypt, toHex, fromHex } from "./encryption";
import type { EncryptedBlob } from "./types";

const PBKDF2_ITERATIONS = 310_000; // OWASP 2023 recommendation
const PBKDF2_HASH = "SHA-512";
const SALT_LENGTH = 32; // 256-bit salt

export interface PasswordVault {
  /** Encrypted localEncKey — decryptable with password */
  encryptedLocalEncKey: EncryptedBlob;
  /** Salt used for PBKDF2 — safe to store plaintext */
  salt: string; // hex
  /** PBKDF2 iterations — stored so we can increase later */
  iterations: number;
  version: "QAP-PWD-V1";
}

/**
 * Derives a 32-byte AES key from a user password using PBKDF2.
 * Slow by design — makes brute force expensive.
 */
async function derivePasswordKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    256 // 32 bytes
  );

  return new Uint8Array(bits);
}

/**
 * Seals the localEncKey with a user password.
 * Call this after wallet creation — user sets their password once.
 *
 * @param localEncKey - 32-byte key from HKDF derivation
 * @param password - user's chosen password
 * @returns PasswordVault — safe to store in IndexedDB
 */
export async function sealWithPassword(
  localEncKey: Uint8Array,
  password: string
): Promise<PasswordVault> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const passwordKey = await derivePasswordKey(password, salt);
  const encryptedLocalEncKey = await encrypt(localEncKey, passwordKey);

  // Zero password key immediately after use
  passwordKey.fill(0);

  return {
    encryptedLocalEncKey,
    salt: toHex(salt),
    iterations: PBKDF2_ITERATIONS,
    version: "QAP-PWD-V1",
  };
}

/**
 * Unseals the localEncKey using the user's password.
 * Call this on redeem — returns localEncKey for Kyber SK decryption.
 * CALLER MUST ZERO the returned key after use.
 *
 * @param vault - PasswordVault from storage
 * @param password - user's password
 * @returns localEncKey — zero this immediately after use
 */
export async function unsealWithPassword(
  vault: PasswordVault,
  password: string
): Promise<Uint8Array> {
  if (vault.version !== "QAP-PWD-V1") {
    throw new Error(`Unknown vault version: ${vault.version}`);
  }

  const salt = fromHex(vault.salt);
  const passwordKey = await derivePasswordKey(password, salt);

  try {
    const localEncKey = await decrypt(vault.encryptedLocalEncKey, passwordKey);
    return localEncKey;
  } catch {
    throw new Error("Wrong password");
  } finally {
    passwordKey.fill(0);
  }
}