import { MlKem1024 } from 'mlkem'

async function sha256(data: Uint8Array): Promise<Uint8Array> {
 const buf = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer)
  return new Uint8Array(buf)
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

async function deriveAesKey(sharedSecret: Uint8Array): Promise<Uint8Array> {
  const label = new TextEncoder().encode('UBTC_KYBER_AES_KEY_V1')
  return sha256(concat(sharedSecret, label))
}

async function xorStream(data: Uint8Array, aesKey: Uint8Array, nonce: Uint8Array): Promise<Uint8Array> {
  const out = new Uint8Array(data.length)
  let offset = 0
  let counter = BigInt(0)
  while (offset < data.length) {
    const ctrBytes = new Uint8Array(8)
    new DataView(ctrBytes.buffer).setBigUint64(0, counter, true)
    const block = await sha256(concat(aesKey, nonce, ctrBytes))
    for (let i = 0; i < block.length && offset < data.length; i++, offset++) {
      out[offset] = data[offset] ^ block[i]
    }
    counter++
  }
  return out
}

async function computeAuthTag(kemCt: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array, aesKey: Uint8Array): Promise<Uint8Array> {
  return sha256(concat(kemCt, nonce, ciphertext, aesKey))
}

export async function kyberEncrypt(plaintext: string, recipientKyberPkHex: string): Promise<string> {
  if (recipientKyberPkHex.length < 3136) throw new Error('Not a real Kyber1024 public key')
  const pkBytes = hexToBytes(recipientKyberPkHex)
  const kem = new MlKem1024()
  const [kemCt, sharedSecret] = await kem.encap(pkBytes)
  const aesKey = await deriveAesKey(sharedSecret)
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const plaintextBytes = new TextEncoder().encode(plaintext)
  const ciphertext = await xorStream(plaintextBytes, aesKey, nonce)
  const authTag = await computeAuthTag(kemCt, nonce, ciphertext, aesKey)
  return [kemCt, nonce, ciphertext, authTag].map(bytesToHex).join(':')
}

export async function kyberDecrypt(encrypted: string, holderKyberSkHex: string): Promise<string> {
  const parts = encrypted.split(':')
  if (parts.length !== 4) throw new Error('Invalid encrypted format')
  const [kemCtHex, nonceHex, ciphertextHex, authTagHex] = parts
  const kemCt = hexToBytes(kemCtHex)
  const nonce = hexToBytes(nonceHex)
  const ciphertext = hexToBytes(ciphertextHex)
  const authTag = hexToBytes(authTagHex)
  const skBytes = hexToBytes(holderKyberSkHex)
  const kem = new MlKem1024()
  const sharedSecret = await kem.decap(kemCt, skBytes)
  const aesKey = await deriveAesKey(sharedSecret)
  const expectedTag = await computeAuthTag(kemCt, nonce, ciphertext, aesKey)
  if (bytesToHex(expectedTag) !== bytesToHex(authTag)) throw new Error('Auth tag mismatch — wrong KEY 3 or corrupted proof')
  const plaintext = await xorStream(ciphertext, aesKey, nonce)
  return new TextDecoder().decode(plaintext)
}

export async function computeNullifier(proofId: string, ownerDilithiumPk: string, anchorRef: string): Promise<string> {
  const preimage = new TextEncoder().encode(`${proofId}:${ownerDilithiumPk}:${anchorRef}`)
  const hash = await sha256(preimage)
  return bytesToHex(hash)
}
