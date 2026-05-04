/**
 * QAP Wallet V1 — Vault Taproot SK Wrap
 *
 * Self-encrypts the user's vault Taproot secret key against their own
 * Kyber1024 public key, so the server can hold ciphertext only.
 *
 * Format: "kyber:<kem_ct_hex>:<iv||aes_ct||tag_hex>"
 *
 * Wrap and unwrap are both 100% client-side. The server never touches
 * the unwrapped secret. The wrap envelope is opaque to the backend —
 * it just stores the string.
 *
 * Crypto:
 *   - ML-KEM-1024 encapsulation against client's own Kyber PK
 *   - HKDF-SHA-256 derives 32-byte AES key from KEM shared secret
 *   - AES-256-GCM with 12-byte random IV, 128-bit auth tag
 */

import { MlKem1024 } from "mlkem";
import { toHex, fromHex } from "./encryption";

const WRAP_PREFIX = "kyber:";
const HKDF_SALT = new TextEncoder().encode("QAP-V1");
const HKDF_INFO = new TextEncoder().encode("QAP-VAULT-TAPROOT-WRAP-V1");
const IV_LENGTH = 12;
const TAG_LENGTH = 128; // bits

/**
 * Derives a 32-byte AES key from a Kyber shared secret using HKDF-SHA-256.
 * Domain-separated by HKDF_INFO so this key cannot collide with any
 * other key derived from the same KEM output.
 */
async function deriveAesKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey(
    "raw",
    sharedSecret.buffer as ArrayBuffer,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: HKDF_SALT.buffer as ArrayBuffer,
      info: HKDF_INFO.buffer as ArrayBuffer,
    },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Wraps a Taproot secret key for storage.
 *
 * @param taprootSk - 32-byte Taproot private key
 * @param kyberPubKey - Client's own ML-KEM-1024 public key (1568 bytes)
 * @returns "kyber:<ct>:<enc>" envelope, server-storable
 */
export async function wrapTaprootSk(
  taprootSk: Uint8Array,
  kyberPubKey: Uint8Array
): Promise<string> {
  if (taprootSk.length !== 32) {
    throw new Error(`Taproot SK must be 32 bytes, got ${taprootSk.length}`);
  }

  // 1. KEM encapsulation against the user's own Kyber public key
  const kyber = new MlKem1024();
  const [kemCt, sharedSecret] = await kyber.encap(kyberPubKey);

  // 2. Derive AES key from shared secret
  const aesKey = await deriveAesKey(new Uint8Array(sharedSecret));

  // 3. AES-256-GCM with random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
    aesKey,
    taprootSk.buffer as ArrayBuffer
  );

  // 4. Pack iv || ct || tag (Web Crypto already appends tag to ct)
  const ctBytes = new Uint8Array(ciphertextWithTag);
  const payload = new Uint8Array(iv.length + ctBytes.length);
  payload.set(iv, 0);
  payload.set(ctBytes, iv.length);

  return `${WRAP_PREFIX}${toHex(new Uint8Array(kemCt))}:${toHex(payload)}`;
}

/**
 * Unwraps a Taproot SK that was previously wrapped with wrapTaprootSk().
 *
 * @param wrapped - "kyber:<ct>:<enc>" string from server
 * @param kyberSecKey - User's ML-KEM-1024 secret key (3168 bytes)
 * @returns 32-byte Taproot SK
 */
export async function unwrapTaprootSk(
  wrapped: string,
  kyberSecKey: Uint8Array
): Promise<Uint8Array> {
  if (!wrapped.startsWith(WRAP_PREFIX)) {
    throw new Error("Wrap envelope missing 'kyber:' prefix");
  }

  const parts = wrapped.slice(WRAP_PREFIX.length).split(":");
  if (parts.length !== 2) {
    throw new Error(`Wrap envelope malformed: expected 2 parts, got ${parts.length}`);
  }

  const kemCt = fromHex(parts[0]);
  const payload = fromHex(parts[1]);

  if (payload.length < IV_LENGTH + TAG_LENGTH / 8) {
    throw new Error("Wrap payload too short");
  }

  // 1. KEM decapsulation
  const kyber = new MlKem1024();
  const sharedSecret = await kyber.decap(kemCt, kyberSecKey);

  // 2. Re-derive AES key
  const aesKey = await deriveAesKey(new Uint8Array(sharedSecret));

  // 3. Split iv from ct||tag
  const iv = payload.slice(0, IV_LENGTH);
  const ctWithTag = payload.slice(IV_LENGTH);

  // 4. Decrypt
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
      aesKey,
      ctWithTag.buffer as ArrayBuffer
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error("Vault Taproot unwrap failed: wrong Kyber key or corrupted envelope");
  }
}