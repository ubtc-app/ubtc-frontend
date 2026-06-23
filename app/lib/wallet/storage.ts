/**
 * QAP Wallet V1 — Secure Local Storage
 *
 * NEVER stores plaintext keys.
 * All stored wallet data is pre-encrypted before this module touches it.
 *
 * Uses IndexedDB for larger blobs, localStorage for metadata.
 *
 * Multi-account: wallets stored as a map keyed by address.
 * Active account tracked separately via ACTIVE_KEY.
 */

import type { StoredWallet } from "./types";

const WALLETS_KEY = "qap_wallets_v1";
const ACTIVE_KEY = "qap_active_wallet";
const PASSWORD_VAULT_KEY = "qap_pwd_vault_v1";
const DB_NAME = "qap_wallet_db";
const DB_STORE = "wallet";
const DB_VERSION = 1;

// Legacy single-wallet key — read during migration only
const LEGACY_KEY = "qap_wallet_v1";

// ─── IndexedDB ────────────────────────────────────────────────────────────────

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

async function dbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    const data = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as string | null);
      req.onerror = () => reject(new Error("IndexedDB read failed"));
    });
    db.close();
    return data;
  } catch {
    return localStorage.getItem(key);
  }
}

async function dbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error("IndexedDB write failed"));
    });
    db.close();
  } catch {
    localStorage.setItem(key, value);
  }
}

async function dbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject();
    });
    db.close();
  } catch {}
  localStorage.removeItem(key);
}

// ─── Wallet map helpers ───────────────────────────────────────────────────────

async function loadWalletMap(): Promise<Record<string, StoredWallet>> {
  // Migrate legacy single wallet if present
  const legacy = await dbGet(LEGACY_KEY);
  if (legacy) {
    try {
      const wallet = JSON.parse(legacy) as StoredWallet;
      const map: Record<string, StoredWallet> = { [wallet.address]: wallet };
      await dbSet(WALLETS_KEY, JSON.stringify(map));
      await dbDelete(LEGACY_KEY);
      // Set as active if none set
      const active = await dbGet(ACTIVE_KEY);
      if (!active) await dbSet(ACTIVE_KEY, wallet.address);
      return map;
    } catch {}
  }

  const raw = await dbGet(WALLETS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, StoredWallet>;
  } catch {
    return {};
  }
}

async function saveWalletMap(map: Record<string, StoredWallet>): Promise<void> {
  const json = JSON.stringify(map);
  await dbSet(WALLETS_KEY, json);
  // Mirror in localStorage so reads never lose data if IndexedDB has a transient error
  try { localStorage.setItem(WALLETS_KEY, json); } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function saveWallet(wallet: StoredWallet): Promise<void> {
  const map = await loadWalletMap();
  map[wallet.address] = wallet;
  await saveWalletMap(map);
  // If no active wallet set yet, make this one active
  const active = await dbGet(ACTIVE_KEY);
  if (!active) {
    await dbSet(ACTIVE_KEY, wallet.address);
    localStorage.setItem("ubtc_wallet_address", wallet.address);
  }
}

export async function loadWallet(): Promise<StoredWallet | null> {
  return loadActiveWallet();
}

export async function loadActiveWallet(): Promise<StoredWallet | null> {
  const active = await dbGet(ACTIVE_KEY)
    ?? localStorage.getItem("ubtc_wallet_address");
  if (!active) return null;
  const map = await loadWalletMap();
  return map[active] ?? null;
}

export async function loadWalletByAddress(address: string): Promise<StoredWallet | null> {
  const map = await loadWalletMap();
  return map[address] ?? null;
}

export async function listWallets(): Promise<StoredWallet[]> {
  const map = await loadWalletMap();
  return Object.values(map);
}

export async function getActiveAddress(): Promise<string | null> {
  return dbGet(ACTIVE_KEY) ?? localStorage.getItem("ubtc_wallet_address");
}

export async function setActiveWallet(address: string): Promise<void> {
  await dbSet(ACTIVE_KEY, address);
  localStorage.setItem("ubtc_wallet_address", address);
}

export async function hasStoredWallet(): Promise<boolean> {
  const map = await loadWalletMap();
  return Object.keys(map).length > 0;
}

export async function clearWallet(): Promise<void> {
  await dbDelete(WALLETS_KEY);
  await dbDelete(ACTIVE_KEY);
  localStorage.removeItem("ubtc_wallet_address");
}

// ─── Password vault ───────────────────────────────────────────────────────────

export async function savePasswordVault(vault: import("./password").PasswordVault): Promise<void> {
  await dbSet(PASSWORD_VAULT_KEY, JSON.stringify(vault));
}

export async function loadPasswordVault(): Promise<import("./password").PasswordVault | null> {
  const raw = await dbGet(PASSWORD_VAULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Encrypted mnemonic ───────────────────────────────────────────────────────

const MNEMONIC_VAULT_KEY = "qap_mnemonic_vault_v1";

export async function saveMnemonicVault(vault: import("./password").PasswordVault): Promise<void> {
  await dbSet(MNEMONIC_VAULT_KEY, JSON.stringify(vault));
}

export async function loadMnemonicVault(): Promise<import("./password").PasswordVault | null> {
  const raw = await dbGet(MNEMONIC_VAULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function toServerPayload(wallet: StoredWallet): {
  address: string;
  kyber_pk: string;
  dilithium_pk: string;
  sphincs_pk: string;
  taproot_pk: string;
} {
  return {
    address: wallet.address,
    kyber_pk: wallet.publicKeys.kyber,
    dilithium_pk: wallet.publicKeys.dilithium,
    sphincs_pk: wallet.publicKeys.sphincs,
    taproot_pk: wallet.publicKeys.taproot,
  };
}
