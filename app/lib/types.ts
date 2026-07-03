// Shared API response types — import these instead of using `any` for API data

export interface Vault {
  id: string
  status: 'pending' | 'active' | 'liquidated'
  account_type: 'current' | 'savings' | 'yield' | 'custody_yield' | 'prime' | 'managed_yield'
  network: string
  btc_amount_sats: number
  ubtc_minted: string
  collateral_ratio: number
  deposit_address: string
  mast_address?: string
  taproot_pubkey?: string
  linked_wallet?: string
  created_at: string
  updated_at?: string
}

export interface Transaction {
  id: string
  type: 'deposit' | 'mint' | 'redeem' | 'transfer_in' | 'transfer_out' | 'move_to_wallet'
  amount: string
  currency: string
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
  txid?: string
  from_address?: string
  to_address?: string
}

export interface WalletRecord {
  id: string
  wallet_address: string
  dilithium_pk?: string
  username?: string
  created_at: string
}

export interface Stablecoin {
  id: string
  currency: 'UUSDT' | 'UUSDC'
  account_type: string
  balance: string
  deposited_amount: string
  created_at: string
}

export interface BtcPrice {
  btc_usd: string
  updated_at?: string
}

export interface VaultNotification {
  id: string
  vault_id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export interface ApiError {
  error: string
  message?: string
}
