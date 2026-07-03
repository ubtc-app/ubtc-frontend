'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useIsMobile } from '../lib/useIsMobile'
import { WLBLogo } from './SiteLogo'
import { listWallets, setActiveWallet, getActiveAddress } from '../lib/wallet/storage'
import type { StoredWallet } from '../lib/wallet/types'


export default function Header() {
  const [authed, setAuthed] = useState(false)
  const [wallets, setWallets] = useState<StoredWallet[]>([])
  const [activeAddress, setActiveAddress] = useState<string | null>(null)
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const isMobile = useIsMobile()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const loadWalletState = () => {
    const isAuthed = !!sessionStorage.getItem('wlb_auth') || !!localStorage.getItem('ubtc_wallet_address')
    setAuthed(isAuthed)
    if (isAuthed) {
      listWallets().then(ws => {
        setWallets(ws)
        const map: Record<string, string> = {}
        for (const w of ws) {
          const saved = localStorage.getItem(`ubtc_username_${w.address}`)
          if (saved) map[w.address] = saved
        }
        setUsernames(map)
      })
      getActiveAddress().then(addr => setActiveAddress(addr))
    }
  }

  useEffect(() => {
    loadWalletState()
  }, [pathname])

  useEffect(() => {
    window.addEventListener('wallets-updated', loadWalletState)
    return () => window.removeEventListener('wallets-updated', loadWalletState)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeWallet = wallets.find(w => w.address === activeAddress)
  const shortAddr = (addr: string) => addr.slice(0, 6) + '···' + addr.slice(-4)

  async function switchAccount(address: string) {
    await setActiveWallet(address)
    setActiveAddress(address)
    setDropdownOpen(false)
    window.location.reload()
  }

  return (
    <nav className="frosted-nav" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: '64px', display: 'flex', alignItems: 'center',
      padding: isMobile ? '0 16px' : '0 32px', justifyContent: 'space-between',
      gap: '12px',
    }}>
      {/* Logo */}
      <a href="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <WLBLogo height={isMobile ? 28 : 32} />
      </a>

      {/* Nav links — hidden on mobile */}
      {authed && !isMobile && (
        <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center' }}>
          <a href="/dashboard" className={`nav-link${pathname === '/dashboard' ? ' active' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            Accounts
          </a>
          <a href="/wallet" className={`nav-link${pathname === '/wallet' ? ' active' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"/>
              <path d="M16 12h6v4h-6a2 2 0 0 1 0-4z"/>
            </svg>
            Wallet
          </a>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {/* Account switcher */}
        {authed && wallets.length > 0 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--t-accent-bg)',
                border: '1px solid var(--t-accent-border)',
                borderRadius: '10px', padding: isMobile ? '6px 10px' : '7px 14px',
                cursor: 'pointer', fontFamily: 'var(--font-display)',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'var(--t-accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', color: 'var(--t-accent)', fontWeight: '700',
              }}>
                {activeWallet ? activeWallet.accountIndex + 1 : '?'}
              </div>
              {!isMobile && (
                <span style={{ color: 'var(--t-accent)', fontSize: '12px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                  {activeAddress && usernames[activeAddress]
                    ? `@${usernames[activeAddress]}`
                    : activeAddress ? shortAddr(activeAddress) : 'No account'}
                </span>
              )}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--t-surface)',
                border: '1px solid var(--t-border)',
                borderRadius: '16px', padding: '8px',
                minWidth: '250px',
                boxShadow: 'var(--t-shadow-lg)', zIndex: 100,
              }}>
                <p className="label" style={{ padding: '6px 10px 8px', display: 'block' }}>Accounts</p>

                {wallets.sort((a, b) => a.accountIndex - b.accountIndex).map(w => (
                  <button
                    key={w.address}
                    onClick={() => switchAccount(w.address)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      background: w.address === activeAddress ? 'var(--t-accent-bg)' : 'transparent',
                      border: w.address === activeAddress ? '1px solid var(--t-accent-border)' : '1px solid transparent',
                      borderRadius: '10px', padding: '10px 12px', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', marginBottom: '3px',
                    }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'var(--t-accent-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', color: 'var(--t-accent)', fontWeight: '700', flexShrink: 0,
                    }}>
                      {w.accountIndex + 1}
                    </div>
                    <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'var(--t-text)', fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                        {usernames[w.address] ? `@${usernames[w.address]}` : `Account ${(w.accountIndex ?? 0) + 1}`}
                      </p>
                      <p style={{ color: 'var(--t-faint)', fontSize: '10px', fontFamily: 'var(--font-mono)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.address}
                      </p>
                    </div>
                    {w.address === activeAddress && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}

                <div className="divider" style={{ margin: '6px 0' }} />
                <a
                  href="/vault"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 12px', color: 'var(--t-accent)',
                    fontSize: '13px', fontWeight: '600', textDecoration: 'none',
                    borderRadius: '10px', fontFamily: 'var(--font-display)',
                  }}
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  New account
                </a>
              </div>
            )}
          </div>
        )}

        {/* Mobile nav links */}
        {authed && isMobile && (
          <>
            <a href="/dashboard" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px',
              background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
              borderRadius: '10px', color: 'var(--t-muted)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
            </a>
          </>
        )}
      </div>
    </nav>
  )
}
