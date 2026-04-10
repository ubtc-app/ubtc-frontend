'use client'
import { useState, useEffect } from 'react'
import { API_URL } from '../lib/supabase'

export default function WalletButton() {
  const [wallet, setWallet] = useState<any>(null)
  const [balance, setBalance] = useState<string>('0')
  const mono: any = { fontFamily: 'var(--font-mono)' }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ubtc_wallet_address')
      if (!stored) return
      const allWallets = localStorage.getItem('ubtc_wallet_data')
      if (allWallets) {
        const w = JSON.parse(allWallets)
        setWallet(w)
      }
      // Fetch balance safely
      fetch(`${API_URL}/wallets/all`)
        .then(r => {
          if (!r.ok) throw new Error('Failed')
          return r.json()
        })
        .then(d => {
          const match = (d.wallets || []).find((w: any) => w.wallet_address === stored)
          if (match) {
            setWallet(match)
            setBalance(match.balance || '0')
          }
        })
        .catch(() => {})
    } catch (e) {}
  }, [])

  if (!wallet) return null

  return (
    <a href="/wallet" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'hsl(205 85% 55% / 0.08)', border: '1px solid hsl(205 85% 55% / 0.25)', borderRadius: '10px', padding: '7px 14px', textDecoration: 'none' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(205 85% 65%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
        <path d="M3 9l2-4h14l2 4"/>
        <circle cx="17" cy="14" r="1.5"/>
      </svg>
      <div>
        <p style={{ color: 'hsl(205 85% 65%)', fontSize: '12px', fontWeight: '600', margin: 0 }}>
          {wallet.wallet_name || wallet.username || 'My Wallet'}
        </p>
        <p style={{ color: 'hsl(205 85% 45%)', fontSize: '10px', ...mono, margin: 0 }}>
          ${parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </a>
  )
}