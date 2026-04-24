/**
 * QAP Wallet V1 — HKDF Key Derivation
 * Uses Web Crypto API directly — no external dependencies.
 */

import type { QAPKeySeeds } from "./types";

const QAP_HKDF_SALT = new TextEncoder().encode("QAP-V1");

const INFO = {
  KYBER: "QAP-KYBER1024-V1",
  DILITHIUM: "QAP-DILITHIUM3-V1",
  TAPROOT: "QAP-TAPROOT-V1",
  LOCAL_ENC: "QAP-LOCAL-ENC-V1",
} as const;

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
 const saltKey = await crypto.subtle.importKey("raw", salt.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const prk = await crypto.subtle.sign("HMAC", saltKey, ikm.buffer as ArrayBuffer);
  return crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
}

async function hkdfExpand(prk: CryptoKey, info: string, length: number): Promise<Uint8Array> {
  const infoBytes = new TextEncoder().encode(info);
  const output = new Uint8Array(length);
  let t = new Uint8Array(0);
  let offset = 0;
  let counter = 1;

  while (offset < length) {
    const input = new Uint8Array(t.length + infoBytes.length + 1);
    input.set(t, 0);
    input.set(infoBytes, t.length);
    input[t.length + infoBytes.length] = counter++;
  t = new Uint8Array(await crypto.subtle.sign("HMAC", prk, input.buffer as ArrayBuffer));
    const toCopy = Math.min(t.length, length - offset);
    output.set(t.slice(0, toCopy), offset);
    offset += toCopy;
  }

  return output;
}

export async function deriveKeySeeds(bip39Seed: Uint8Array): Promise<QAPKeySeeds> {
  if (bip39Seed.length !== 64) {
    throw new Error(`Invalid BIP39 seed length: expected 64 bytes, got ${bip39Seed.length}`);
  }

  const prk = await hkdfExtract(QAP_HKDF_SALT, bip39Seed);

  const [kyberSeed, dilithiumSeed, taprootSeed, localEncKey] = await Promise.all([
    hkdfExpand(prk, INFO.KYBER, 64),
    hkdfExpand(prk, INFO.DILITHIUM, 64),
    hkdfExpand(prk, INFO.TAPROOT, 32),
    hkdfExpand(prk, INFO.LOCAL_ENC, 32),
  ]);

  return { kyberSeed, dilithiumSeed, taprootSeed, localEncKey };
}

export function keyFingerprint(seeds: QAPKeySeeds): string {
  return Array.from(seeds.localEncKey.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}