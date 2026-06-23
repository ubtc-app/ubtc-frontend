import { MlKem1024 } from 'mlkem'

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string')
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function deriveAesKey(sharedSecret: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const label = new TextEncoder().encode('UBTC_KYBER_AES_KEY_V1')
  const ikm = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: label },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Format: <kemCt_hex>:<iv_hex>:<ciphertext+tag_hex>
// Version tag is encoded in the KEM ciphertext length (3168 bytes for ML-KEM-1024).

export async function kyberEncrypt(plaintext: string, recipientKyberPkHex: string): Promise<string> {
  if (recipientKyberPkHex.length < 3136) throw new Error('Not a real Kyber1024 public key')
  const pkBytes = hexToBytes(recipientKyberPkHex)
  const kem = new MlKem1024()
  const [kemCt, sharedSecret] = await kem.encap(pkBytes)
  const aesKey = await deriveAesKey(sharedSecret.buffer instanceof ArrayBuffer ? sharedSecret as unknown as Uint8Array<ArrayBuffer> : new Uint8Array(sharedSecret))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintextBytes = new TextEncoder().encode(plaintext)
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    plaintextBytes,
  )
  return [kemCt, iv, new Uint8Array(ciphertextWithTag)].map(bytesToHex).join(':')
}

export async function kyberDecrypt(encrypted: string, holderKyberSkHex: string): Promise<string> {
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const [kemCtHex, ivHex, ciphertextHex] = parts
  const kemCt = hexToBytes(kemCtHex)
  const iv = hexToBytes(ivHex)
  const ciphertextWithTag = hexToBytes(ciphertextHex)
  const skBytes = hexToBytes(holderKyberSkHex)
  const kem = new MlKem1024()
  const sharedSecret = await kem.decap(kemCt, skBytes)
  const aesKey = await deriveAesKey(new Uint8Array(sharedSecret))
  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      ciphertextWithTag,
    )
  } catch {
    throw new Error('Decryption failed: wrong key or corrupted proof')
  }
  return new TextDecoder().decode(plaintext)
}

export async function computeNullifier(proofId: string, ownerDilithiumPk: string, anchorRef: string): Promise<string> {
  const preimage = new TextEncoder().encode(`${proofId}:${ownerDilithiumPk}:${anchorRef}`)
  const hash = await crypto.subtle.digest('SHA-256', preimage)
  return bytesToHex(new Uint8Array(hash))
}
