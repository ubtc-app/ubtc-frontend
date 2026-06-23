/**
 * QAP Signing Worker
 *
 * Runs in an isolated Web Worker context — no DOM access, separate memory.
 * Private keys are decrypted here, used, then zeroed. They never reach the
 * main thread. Only finished signatures are posted back.
 */

import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'
import { slh_dsa_shake_256s } from '@noble/post-quantum/slh-dsa.js'
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { MlKem1024 } from 'mlkem'
import { HDKey } from '@scure/bip32'

// ─── Types (duplicated from types.ts — worker cannot import from app) ─────────

interface EncryptedBlob {
  iv: string
  ciphertext: string
  tag: string
  version: 'AES-256-GCM-V1'
}

interface QAPEncryptedSecrets {
  kyber_sk: EncryptedBlob
  dilithium_sk: EncryptedBlob
  sphincs_sk: EncryptedBlob
  taproot_sk: EncryptedBlob
}

interface StoredWallet {
  address: string
  publicKeys: { taproot: string; kyber: string; dilithium: string; sphincs: string }
  encrypted: QAPEncryptedSecrets
  version: 'QAP-WALLET-V1'
  createdAt: number
}

// ─── Message types ────────────────────────────────────────────────────────────

export type WorkerPayload =
  | { op: 'sign_hybrid'; wallet: StoredWallet; mnemonic: string; message: number[] }
  | { op: 'sign_hybrid_with_enc_key'; wallet: StoredWallet; localEncKey: number[]; message: number[] }
  | { op: 'create_wallet'; accountIndex: number }
  | { op: 'restore_wallet'; mnemonic: string; accountIndex: number }

export type WorkerRequest = WorkerPayload & { id: string }

export type WorkerResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: string }

// ─── Hex utilities ────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string')
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

// ─── AES-256-GCM ─────────────────────────────────────────────────────────────

async function importAesKey(keyMaterial: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

function toArrayBuffer(arr: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(arr.buffer instanceof ArrayBuffer ? arr.buffer : arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength), arr.byteOffset, arr.byteLength) as Uint8Array<ArrayBuffer>
}

async function aesEncrypt(plaintext: Uint8Array, keyMaterial: Uint8Array): Promise<EncryptedBlob> {
  const key = await importAesKey(toArrayBuffer(keyMaterial))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const result = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, toArrayBuffer(plaintext))
  const bytes = new Uint8Array(result)
  const tagOffset = bytes.length - 16
  return {
    iv: toHex(iv),
    ciphertext: toHex(bytes.slice(0, tagOffset)),
    tag: toHex(bytes.slice(tagOffset)),
    version: 'AES-256-GCM-V1',
  }
}

async function aesDecrypt(blob: EncryptedBlob, keyMaterial: Uint8Array): Promise<Uint8Array> {
  const key = await importAesKey(toArrayBuffer(keyMaterial))
  const iv = fromHex(blob.iv)
  const ciphertext = fromHex(blob.ciphertext)
  const tag = fromHex(blob.tag)
  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext)
  combined.set(tag, ciphertext.length)
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, combined)
    return new Uint8Array(plaintext)
  } catch {
    throw new Error('Decryption failed: invalid key or corrupted data')
  }
}

// ─── HKDF ────────────────────────────────────────────────────────────────────

const QAP_HKDF_SALT = new TextEncoder().encode('QAP-V1')

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
  const saltKey = await crypto.subtle.importKey('raw', toArrayBuffer(salt), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const prk = await crypto.subtle.sign('HMAC', saltKey, toArrayBuffer(ikm))
  return crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
}

async function hkdfExpand(prk: CryptoKey, info: string, length: number): Promise<Uint8Array> {
  const infoBytes = new TextEncoder().encode(info)
  const output = new Uint8Array(length)
  let t = new Uint8Array(0)
  let offset = 0
  let counter = 1
  while (offset < length) {
    const input = new Uint8Array(t.length + infoBytes.length + 1)
    input.set(t)
    input.set(infoBytes, t.length)
    input[t.length + infoBytes.length] = counter++
    t = new Uint8Array(await crypto.subtle.sign('HMAC', prk, toArrayBuffer(input)))
    const toCopy = Math.min(t.length, length - offset)
    output.set(t.slice(0, toCopy), offset)
    offset += toCopy
  }
  return output
}

async function deriveKeySeeds(bip39Seed: Uint8Array) {
  const prk = await hkdfExtract(QAP_HKDF_SALT, bip39Seed)
  const [kyberSeed, dilithiumSeed, sphincsSeed, taprootSeed, vaultTaprootSeed, localEncKey] = await Promise.all([
    hkdfExpand(prk, 'QAP-KYBER1024-V1', 64),
    hkdfExpand(prk, 'QAP-DILITHIUM3-V1', 64),
    hkdfExpand(prk, 'QAP-SPHINCS-SHAKE256s-V1', 96),
    hkdfExpand(prk, 'QAP-TAPROOT-V1', 32),
    hkdfExpand(prk, 'QAP-VAULT-TAPROOT-V1', 32),
    hkdfExpand(prk, 'QAP-LOCAL-ENC-V1', 32),
  ])
  return { kyberSeed, dilithiumSeed, sphincsSeed, taprootSeed, vaultTaprootSeed, localEncKey }
}

// ─── Key derivation helpers ───────────────────────────────────────────────────

function taprootPath(accountIndex: number): string {
  return `m/44'/0'/${accountIndex}'/0/0`
}

function deriveTaprootKey(seed: Uint8Array, accountIndex = 0) {
  const root = HDKey.fromMasterSeed(seed)
  const child = root.derive(taprootPath(accountIndex))
  if (!child.privateKey || !child.publicKey) throw new Error('BIP32 derivation failed')
  return { taprootPrivKey: new Uint8Array(child.privateKey), taprootPubKey: new Uint8Array(child.publicKey) }
}

function generateDilithiumKeypair(seed: Uint8Array) {
  const { publicKey, secretKey } = ml_dsa65.keygen(seed.slice(0, 32))
  return { dilithiumPubKey: new Uint8Array(publicKey), dilithiumSecKey: new Uint8Array(secretKey) }
}

function generateSphincsKeypair(seed: Uint8Array) {
  const { publicKey, secretKey } = slh_dsa_shake_256s.keygen(seed.slice(0, 96))
  return { sphincsPubKey: new Uint8Array(publicKey), sphincsSecKey: new Uint8Array(secretKey) }
}

async function generateKyberKeypair() {
  const kem = new MlKem1024()
  const [pub, sec] = await kem.generateKeyPair()
  return { kyberPubKey: new Uint8Array(pub), kyberSecKey: new Uint8Array(sec) }
}

async function deriveAddress(pubKey: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(pubKey))
  return `ubtc${toHex(new Uint8Array(hash)).slice(0, 24)}`
}

// ─── Operations ───────────────────────────────────────────────────────────────

async function signHybrid(
  wallet: StoredWallet,
  localEncKey: Uint8Array,
  message: Uint8Array,
): Promise<{ dilithiumSig: string; sphincsSig: string }> {
  const dilithiumSk = await aesDecrypt(wallet.encrypted.dilithium_sk, localEncKey)
  const sphincsSk = await aesDecrypt(wallet.encrypted.sphincs_sk, localEncKey)
  try {
    const dilithiumSigBytes = ml_dsa65.sign(message, dilithiumSk)
    const sphincsSigBytes = slh_dsa_shake_256s.sign(message, sphincsSk)
    return { dilithiumSig: toHex(dilithiumSigBytes), sphincsSig: toHex(sphincsSigBytes) }
  } finally {
    dilithiumSk.fill(0)
    sphincsSk.fill(0)
  }
}

async function handleSignHybrid(wallet: StoredWallet, mnemonic: string, message: Uint8Array) {
  const bip39Seed = mnemonicToSeedSync(mnemonic.trim())
  const seeds = await deriveKeySeeds(bip39Seed)
  try {
    return await signHybrid(wallet, seeds.localEncKey, message)
  } finally {
    seeds.localEncKey.fill(0)
    seeds.dilithiumSeed.fill(0)
    seeds.sphincsSeed.fill(0)
    seeds.kyberSeed.fill(0)
    seeds.taprootSeed.fill(0)
    seeds.vaultTaprootSeed.fill(0)
  }
}

async function handleCreateWallet(accountIndex = 0) {
  const mnemonic = generateMnemonic(wordlist, 256)
  const bip39Seed = mnemonicToSeedSync(mnemonic)
  const seeds = await deriveKeySeeds(bip39Seed)
  const { taprootPubKey, taprootPrivKey } = deriveTaprootKey(seeds.taprootSeed, accountIndex)
  const { kyberPubKey, kyberSecKey } = await generateKyberKeypair()
  const { dilithiumPubKey, dilithiumSecKey } = generateDilithiumKeypair(seeds.dilithiumSeed)
  const { sphincsPubKey, sphincsSecKey } = generateSphincsKeypair(seeds.sphincsSeed)

  const [kyber_sk, dilithium_sk, sphincs_sk, taproot_sk] = await Promise.all([
    aesEncrypt(kyberSecKey, seeds.localEncKey),
    aesEncrypt(dilithiumSecKey, seeds.localEncKey),
    aesEncrypt(sphincsSecKey, seeds.localEncKey),
    aesEncrypt(taprootPrivKey, seeds.localEncKey),
  ])

  const address = await deriveAddress(dilithiumPubKey)

  seeds.localEncKey.fill(0)
  seeds.kyberSeed.fill(0)
  seeds.dilithiumSeed.fill(0)
  seeds.sphincsSeed.fill(0)
  seeds.taprootSeed.fill(0)
  seeds.vaultTaprootSeed.fill(0)
  kyberSecKey.fill(0)
  dilithiumSecKey.fill(0)
  sphincsSecKey.fill(0)
  taprootPrivKey.fill(0)

  return {
    mnemonic,
    address,
    publicKeys: {
      taproot: toHex(taprootPubKey),
      kyber: toHex(kyberPubKey),
      dilithium: toHex(dilithiumPubKey),
      sphincs: toHex(sphincsPubKey),
    },
    encrypted: { kyber_sk, dilithium_sk, sphincs_sk, taproot_sk },
    version: 'QAP-WALLET-V1' as const,
    createdAt: Date.now(),
    accountIndex,
  }
}

async function handleRestoreWallet(mnemonic: string, accountIndex = 0) {
  if (!validateMnemonic(mnemonic, wordlist)) throw new Error('Invalid mnemonic phrase')
  const bip39Seed = mnemonicToSeedSync(mnemonic.trim())
  const seeds = await deriveKeySeeds(bip39Seed)
  const { dilithiumPubKey, dilithiumSecKey } = generateDilithiumKeypair(seeds.dilithiumSeed)
  const { sphincsPubKey, sphincsSecKey } = generateSphincsKeypair(seeds.sphincsSeed)
  const { kyberPubKey, kyberSecKey } = await generateKyberKeypair()
  const { taprootPubKey, taprootPrivKey } = deriveTaprootKey(seeds.taprootSeed, accountIndex)

  const [kyber_sk, dilithium_sk, sphincs_sk, taproot_sk] = await Promise.all([
    aesEncrypt(kyberSecKey, seeds.localEncKey),
    aesEncrypt(dilithiumSecKey, seeds.localEncKey),
    aesEncrypt(sphincsSecKey, seeds.localEncKey),
    aesEncrypt(taprootPrivKey, seeds.localEncKey),
  ])

  const address = await deriveAddress(dilithiumPubKey)

  seeds.localEncKey.fill(0)
  seeds.kyberSeed.fill(0)
  seeds.dilithiumSeed.fill(0)
  seeds.sphincsSeed.fill(0)
  seeds.taprootSeed.fill(0)
  seeds.vaultTaprootSeed.fill(0)
  kyberSecKey.fill(0)
  dilithiumSecKey.fill(0)
  sphincsSecKey.fill(0)
  taprootPrivKey.fill(0)

  return {
    address,
    publicKeys: {
      taproot: toHex(taprootPubKey),
      kyber: toHex(kyberPubKey),
      dilithium: toHex(dilithiumPubKey),
      sphincs: toHex(sphincsPubKey),
    },
    encrypted: { kyber_sk, dilithium_sk, sphincs_sk, taproot_sk },
    version: 'QAP-WALLET-V1' as const,
    createdAt: Date.now(),
    accountIndex,
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  try {
    let result: unknown

    if (req.op === 'sign_hybrid') {
      result = await handleSignHybrid(req.wallet, req.mnemonic, new Uint8Array(req.message))

    } else if (req.op === 'sign_hybrid_with_enc_key') {
      result = await signHybrid(req.wallet, new Uint8Array(req.localEncKey), new Uint8Array(req.message))

    } else if (req.op === 'create_wallet') {
      result = await handleCreateWallet(req.accountIndex)

    } else if (req.op === 'restore_wallet') {
      result = await handleRestoreWallet(req.mnemonic, req.accountIndex)

    } else {
      throw new Error(`Unknown op: ${(req as WorkerRequest).op}`)
    }

    const response: WorkerResponse = { id: req.id, ok: true, result }
    self.postMessage(response)

  } catch (err) {
    const response: WorkerResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown worker error',
    }
    self.postMessage(response)
  }
}
