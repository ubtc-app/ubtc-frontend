/**
 * QAP Wallet V1 — Type Definitions
 * Production-critical. Do not modify without full review.
 */

/** Structured AES-256-GCM ciphertext */
export interface EncryptedBlob {
  iv: string;         // hex — 12 bytes, random per encryption
  ciphertext: string; // hex — encrypted payload
  tag: string;        // hex — 16 byte GCM auth tag
  version: "AES-256-GCM-V1";
}

/** Public keys — safe to share / send to server */
export interface QAPPublicKeys {
  taproot: string;    // hex compressed secp256k1 public key (33 bytes)
  kyber: string;      // hex Kyber1024 public key (1568 bytes = 3136 hex chars)
  dilithium: string;  // hex ML-DSA-65 public key (1952 bytes)
  sphincs: string;    // hex SLH-DSA-SHAKE-256s public key (64 bytes)
}

/** Encrypted secret keys — stored locally, never leave device */
export interface QAPEncryptedSecrets {
  kyber_sk: EncryptedBlob;     // Kyber1024 secret key encrypted with localEncKey
  dilithium_sk: EncryptedBlob; // ML-DSA-65 secret key encrypted with localEncKey
  sphincs_sk: EncryptedBlob;   // SLH-DSA-SHAKE-256s secret key encrypted with localEncKey
  taproot_sk: EncryptedBlob;   // Taproot private key encrypted with localEncKey
}

/** Derived key seeds — intermediate material, never stored */
export interface QAPKeySeeds {
  kyberSeed: Uint8Array;      // 64 bytes — used as RNG for Kyber keypair
  dilithiumSeed: Uint8Array;  // 64 bytes — used as RNG for ML-DSA keypair
  sphincsSeed: Uint8Array;    // 96 bytes — used as RNG for SLH-DSA keypair
  taprootSeed: Uint8Array;    // 32 bytes — fed into BIP32
  localEncKey: Uint8Array;    // 32 bytes — AES-256-GCM master encryption key
}

/** Full wallet object — mnemonic only shown at creation */
export interface QAPWallet {
  /**
   * BIP39 mnemonic — shown ONCE at creation, never stored by this module.
   * User must back this up. Loss = permanent loss of access.
   */
  mnemonic: string;

  /** Wallet address — derived from taproot public key */
  address: string;

  /** Public keys — safe to send to server */
  publicKeys: QAPPublicKeys;

  /** Encrypted secrets — stored in localStorage */
  encrypted: QAPEncryptedSecrets;

  /** Protocol version for future migration */
  version: "QAP-WALLET-V1";

  /** Unix timestamp of creation */
  createdAt: number;
}

/** Stored wallet — what we persist to localStorage (no mnemonic) */
export interface StoredWallet {
  address: string;
  publicKeys: QAPPublicKeys;
  encrypted: QAPEncryptedSecrets;
  version: "QAP-WALLET-V1";
  createdAt: number;
}

/** Result of wallet restoration */
export interface WalletRestoreResult {
  success: boolean;
  wallet?: QAPWallet;
  error?: string;
}

/** Key Share B stub — interface for future MPC/node integration */
export interface KeyShareB {
  /**
   * Signs a transaction request using Key Share B.
   * Currently stubbed as local signing.
   * Future: routes to QAP node network via FROST threshold signing.
   */
  sign(request: SigningRequest): Promise<PartialSignature>;
}

export interface SigningRequest {
  payload: Uint8Array;
  walletAddress: string;
  timestamp: number;
}

export interface PartialSignature {
  signature: Uint8Array;
  signerPublicKey: string;
  isStub: boolean; // true until node network is live
}