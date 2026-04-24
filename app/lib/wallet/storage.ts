/**
 * QAP Wallet V1 — Secure Local Storage
 *
 * NEVER stores plaintext keys.
 * All stored wallet data is pre-encrypted before this module touches it.
 *
 * Uses IndexedDB for larger blobs, localStorage for metadata.
 */

import type { StoredWallet } from "./types";

const STORAGE_KEY = "qap_wallet_v1";
const PASSWORD_VAULT_KEY = "qap_pwd_vault_v1";
const DB_NAME = "qap_wallet_db";
const DB_STORE = "wallet";
const DB_VERSION = 1;

// ─── IndexedDB (primary — more storage, better performance) ──────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("Failed to open IndexedDB"));
  });
}

/**
 * Saves encrypted wallet to IndexedDB.
 * Falls back to localStorage if IndexedDB is unavailable.
 *
 * @param wallet - StoredWallet (already encrypted, safe to persist)
 */
export async function saveWallet(wallet: StoredWallet): Promise<void> {
  const serialised = JSON.stringify(wallet);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const req = store.put(serialised, STORAGE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error("IndexedDB write failed"));
    });
    db.close();
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, serialised);
    } catch {
      throw new Error(
        "Storage failed: IndexedDB and localStorage both unavailable"
      );
    }
  }
}

/**
 * Loads encrypted wallet from storage.
 * Returns null if no wallet is stored.
 */
export async function loadWallet(): Promise<StoredWallet | null> {
  try {
    const db = await openDB();
    const data = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const req = store.get(STORAGE_KEY);
      req.onsuccess = () => resolve(req.result as string | null);
      req.onerror = () => reject(new Error("IndexedDB read failed"));
    });
    db.close();

    if (data) return JSON.parse(data) as StoredWallet;
  } catch {
    // Try localStorage fallback
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data) as StoredWallet;
      } catch {
        throw new Error("Wallet data corrupted in localStorage");
      }
    }
  }

  return null;
}

/**
 * Deletes all wallet data from storage.
 * Use only for wallet deletion or reset flows.
 * Irreversible without mnemonic.
 */
export async function clearWallet(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const req = store.delete(STORAGE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error("IndexedDB delete failed"));
    });
    db.close();
  } catch {
    // ignore
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns true if a wallet is stored in this browser.
 */
export async function hasStoredWallet(): Promise<boolean> {
  const wallet = await loadWallet();
  return wallet !== null;
}

/**
 * Converts StoredWallet to the format safe to send to the backend.
 * ONLY public keys — never encrypted secrets.
 */
export function toServerPayload(wallet: StoredWallet): {
  address: string;
  kyber_pk: string;
  dilithium_pk: string;
  taproot_pk: string;
} {
  return {
    address: wallet.address,
    kyber_pk: wallet.publicKeys.kyber,
    dilithium_pk: wallet.publicKeys.dilithium,
    taproot_pk: wallet.publicKeys.taproot,
  };
}
export async function savePasswordVault(vault: import("./password").PasswordVault): Promise<void> {
  const serialised = JSON.stringify(vault);
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const req = store.put(serialised, PASSWORD_VAULT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error("IndexedDB write failed"));
    });
    db.close();
  } catch {
    localStorage.setItem(PASSWORD_VAULT_KEY, serialised);
  }
}

export async function loadPasswordVault(): Promise<import("./password").PasswordVault | null> {
  try {
    const db = await openDB();
    const data = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const req = store.get(PASSWORD_VAULT_KEY);
      req.onsuccess = () => resolve(req.result as string | null);
      req.onerror = () => reject();
    });
    db.close();
    if (data) return JSON.parse(data);
  } catch {
    const data = localStorage.getItem(PASSWORD_VAULT_KEY);
    if (data) return JSON.parse(data);
  }
  return null;
}