'use client'
import { useEffect, useState } from 'react'

export default function Header() {
  const [authed, setAuthed] = useState(false)
  useEffect(() => {
    setAuthed(!!sessionStorage.getItem('wlb_auth') || !!localStorage.getItem('ubtc_wallet_address'))
  }, [])
  if (!authed) return null

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'hsl(220 15% 5% / 0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>

      <a href="/dashboard" style={{ textDecoration: 'none' }}>
        <img src="/wlb.png" alt="World Local Bank" style={{ height: '34px', objectFit: 'contain' }} />
      </a>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'hsl(0 0% 55%)', textDecoration: 'none', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)', padding: '8px 14px', borderRadius: '8px', background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          My Accounts
        </a>

        <a href="/wallet" style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'hsl(205 85% 65%)', textDecoration: 'none', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)', padding: '8px 14px', borderRadius: '8px', background: 'hsl(205 85% 55% / 0.1)', border: '1px solid hsl(205 85% 55% / 0.3)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
          My Wallet
        </a>

        <a href="/vault" style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-display)', padding: '8px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', boxShadow: '0 0 20px hsl(205 85% 55% / 0.3)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New Account
        </a>

      </div>
    </nav>
  )
}
