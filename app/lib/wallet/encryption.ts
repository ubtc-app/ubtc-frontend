/**
 * QAP Wallet V1 — AES-256-GCM Encryption
 *
 * All secret keys are encrypted before storage.
 * NEVER store plaintext keys. NEVER reuse IVs.
 *
 * Uses Web Crypto API (browser-native, FIPS-validated).
 */

import type { EncryptedBlob } from "./types";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;  // 96-bit IV — optimal for GCM
const TAG_LENGTH = 128; // 128-bit auth tag — maximum GCM security

/**
 * Imports a raw key for AES-256-GCM operations.
 * Key material must be exactly 32 bytes.
 */
async function importKey(
  keyMaterial: Uint8Array,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  if (keyMaterial.length !== 32) {
    throw new Error(
      `Invalid key length: expected 32 bytes, got ${keyMaterial.length}`
    );
  }

  return crypto.subtle.importKey(
    "raw",
    keyMaterial.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    usage
  );
}

/**
 * Encrypts plaintext using AES-256-GCM.
 *
 * Security:
 * - IV is randomly generated per encryption — NEVER reused
 * - Auth tag authenticates both ciphertext and IV
 * - Decryption will fail if ciphertext or IV is tampered with
 *
 * @param plaintext - Raw bytes to encrypt
 * @param keyMaterial - 32-byte AES key (localEncKey from HKDF)
 * @returns EncryptedBlob with IV, ciphertext, and auth tag
 */
export async function encrypt(
  plaintext: Uint8Array,
  keyMaterial: Uint8Array
): Promise<EncryptedBlob> {
  const key = await importKey(keyMaterial, ["encrypt"]);

  // Fresh random IV per encryption — critical for GCM security
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
    key,
    plaintext.buffer as ArrayBuffer
  );

  // Web Crypto appends the auth tag to the ciphertext
  // Split them for explicit storage
  const ciphertextBytes = new Uint8Array(ciphertextWithTag);
  const tagOffset = ciphertextBytes.length - TAG_LENGTH / 8;
  const ciphertext = ciphertextBytes.slice(0, tagOffset);
  const tag = ciphertextBytes.slice(tagOffset);

  return {
    iv: toHex(iv),
    ciphertext: toHex(ciphertext),
    tag: toHex(tag),
    version: "AES-256-GCM-V1",
  };
}

/**
 * Decrypts an EncryptedBlob using AES-256-GCM.
 *
 * Throws if:
 * - Auth tag verification fails (tampered data)
 * - Wrong key
 * - Malformed blob
 *
 * @param blob - EncryptedBlob from encrypt()
 * @param keyMaterial - Same 32-byte key used for encryption
 * @returns Decrypted plaintext bytes
 */
export async function decrypt(
  blob: EncryptedBlob,
  keyMaterial: Uint8Array
): Promise<Uint8Array> {
  if (blob.version !== "AES-256-GCM-V1") {
    throw new Error(`Unknown encryption version: ${blob.version}`);
  }

  const key = await importKey(keyMaterial, ["decrypt"]);

  const iv = fromHex(blob.iv);
  const ciphertext = fromHex(blob.ciphertext);
  const tag = fromHex(blob.tag);

  // Re-combine ciphertext + tag as Web Crypto expects
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
      key,
      combined.buffer as ArrayBuffer
    );
    return new Uint8Array(plaintext);
  } catch {
    // Deliberately vague error — do not leak timing or key info
    throw new Error("Decryption failed: invalid key or corrupted data");
  }
}

// ─── Hex utilities ───────────────────────────────────────────────────────────

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
