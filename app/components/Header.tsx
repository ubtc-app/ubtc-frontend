'use client'
import { useEffect, useState } from 'react'
import { useIsMobile } from '../lib/useIsMobile'
export default function Header() {
  const [authed, setAuthed] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => {
    setAuthed(!!sessionStorage.getItem('wlb_auth') || !!localStorage.getItem('ubtc_wallet_address'))
  }, [])
  if (!authed) return null
  const linkStyle: any = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'hsl(0 0% 88%)',
    textDecoration: 'none',
    fontSize: isMobile ? '12px' : '13px',
    fontWeight: '600',
    fontFamily: 'var(--font-display)',
    padding: isMobile ? '7px 12px' : '8px 14px',
    borderRadius: '8px',
    background: 'hsl(220 12% 10%)',
    border: '1px solid hsl(220 10% 16%)',
    whiteSpace: 'nowrap'
  }
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'hsl(220 15% 5% / 0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: isMobile ? '0 12px' : '0 28px', justifyContent: 'space-between' }}>
      <a href='/dashboard' style={{ textDecoration: 'none' }}>
        <img src='/wlb.png' alt='UBTC Quantum Account' style={{ height: isMobile ? '28px' : '34px', objectFit: 'contain' }} />
      </a>
      <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', alignItems: 'center' }}>
        <a href='/dashboard' style={linkStyle}>
          <svg width={isMobile ? '13' : '15'} height={isMobile ? '13' : '15'} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='2' y='3' width='20' height='14' rx='2'/><path d='M8 21h8M12 17v4'/></svg>
          Account
        </a>
        <a href='/wallet' style={linkStyle}>
          <svg width={isMobile ? '13' : '15'} height={isMobile ? '13' : '15'} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1'/><path d='M16 12h6v4h-6a2 2 0 0 1 0-4z'/></svg>
          Wallet
        </a>
      </div>
    </nav>
  )
}