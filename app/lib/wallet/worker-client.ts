/**
 * QAP Signing Worker Client
 *
 * Thin wrapper around the Web Worker. The rest of the app imports from here
 * instead of calling wallet.ts signing functions directly.
 *
 * All private key operations happen inside the worker — keys never reach
 * the main thread.
 */

import type { WorkerRequest, WorkerResponse } from './signing.worker'
import type { StoredWallet } from './types'

let worker: Worker | null = null
let workerReady = false

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./signing.worker.ts', import.meta.url), { type: 'module' })
    workerReady = true
  }
  return worker
}

function call<T>(request: Omit<WorkerRequest, 'id'>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    const w = getWorker()

    const handler = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return
      w.removeEventListener('message', handler)
      if (event.data.ok) {
        resolve(event.data.result as T)
      } else {
        reject(new Error(event.data.error))
      }
    }

    w.addEventListener('message', handler)
    w.postMessage({ ...request, id } as WorkerRequest)
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function workerSignHybrid(
  wallet: StoredWallet,
  mnemonic: string,
  message: Uint8Array,
): Promise<{ dilithiumSig: string; sphincsSig: string }> {
  return call({
    op: 'sign_hybrid',
    wallet,
    mnemonic,
    message: Array.from(message),
  })
}

export async function workerSignHybridWithEncKey(
  wallet: StoredWallet,
  localEncKey: Uint8Array,
  message: Uint8Array,
): Promise<{ dilithiumSig: string; sphincsSig: string }> {
  return call({
    op: 'sign_hybrid_with_enc_key',
    wallet,
    localEncKey: Array.from(localEncKey),
    message: Array.from(message),
  })
}

export async function workerCreateWallet(accountIndex = 0): Promise<{
  mnemonic: string
  address: string
  publicKeys: { taproot: string; kyber: string; dilithium: string; sphincs: string }
  encrypted: StoredWallet['encrypted']
  version: 'QAP-WALLET-V1'
  createdAt: number
}> {
  return call({ op: 'create_wallet', accountIndex })
}

export async function workerRestoreWallet(mnemonic: string, accountIndex = 0): Promise<{
  address: string
  publicKeys: { taproot: string; kyber: string; dilithium: string; sphincs: string }
  encrypted: StoredWallet['encrypted']
  version: 'QAP-WALLET-V1'
  createdAt: number
}> {
  return call({ op: 'restore_wallet', mnemonic, accountIndex })
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
    workerReady = false
  }
}
