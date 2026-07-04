'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useIsMobile } from '../lib/useIsMobile'
import { WLBLogo } from './SiteLogo'
import { listWallets, setActiveWallet, getActiveAddress } from '../lib/wallet/storage'
import type { StoredWallet } from '../lib/wallet/types'
import { useQuantumNav } from './QuantumTransition'


export default function Header() {
  const [authed, setAuthed]           = useState(false)
  const [wallets, setWallets]         = useState<StoredWallet[]>([])
  const [activeAddress, setActiveAddress] = useState<string | null>(null)
  const [usernames, setUsernames]     = useState<Record<string, string>>({})
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [institutional, setInstitutional] = useState(false)
  const isMobile   = useIsMobile()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname   = usePathname()
  const { navigate } = useQuantumNav()

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

  useEffect(() => { loadWalletState() }, [pathname])

  useEffect(() => {
    const check = () => setInstitutional(
      localStorage.getItem('qufi_theme') === 'light' ||
      localStorage.getItem('qufi_user_type') === 'institutional'
    )
    check()
    window.addEventListener('qufi-profile-changed', check)
    window.addEventListener('wallets-updated', loadWalletState)
    return () => {
      window.removeEventListener('qufi-profile-changed', check)
      window.removeEventListener('wallets-updated', loadWalletState)
    }
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
  const displayName = activeAddress && usernames[activeAddress]
    ? `@${usernames[activeAddress]}`
    : activeAddress ? shortAddr(activeAddress) : null

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
      padding: isMobile ? '0 16px' : '0 28px', justifyContent: 'space-between',
      gap: '12px',
      ...(institutional ? {
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(12px)',
      } : {}),
    }}>

      {/* ── Logo ── */}
      <a
        href="/dashboard"
        onClick={e => { e.preventDefault(); navigate('/dashboard', 32, 32) }}
        style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }}
      >
        <WLBLogo height={isMobile ? 26 : 30} />
      </a>

      {/* ── Desktop nav pills ── */}
      {authed && !isMobile && (
        <div style={{
          display: 'flex', gap: '2px',
          background: institutional ? '#f1f5f9' : 'rgba(255,255,255,0.03)',
          border: institutional ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '50px',
          padding: '3px',
        }}>
          <NavPill
            href="/dashboard"
            active={pathname === '/dashboard'}
            onClick={() => navigate('/dashboard')}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            }
            label="Accounts"
          />
          <NavPill
            href="/wallet"
            active={pathname === '/wallet'}
            onClick={() => navigate('/wallet')}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"/>
                <path d="M16 12h6v4h-6a2 2 0 0 1 0-4z"/>
              </svg>
            }
            label="Wallet"
          />
        </div>
      )}

      {/* ── Right side ── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>

        {/* Mobile dashboard icon */}
        {authed && isMobile && (
          <a href="/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px', color: 'rgba(180,210,255,0.5)',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </a>
        )}

        {/* Account switcher */}
        {authed && wallets.length > 0 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: institutional ? (dropdownOpen?'#f1f5f9':'#f8fafc') : (dropdownOpen ? 'rgba(0,212,255,0.1)' : 'rgba(0,212,255,0.06)'),
                border: institutional ? `1px solid ${dropdownOpen?'#cbd5e1':'#e2e8f0'}` : `1px solid ${dropdownOpen ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.15)'}`,
                borderRadius: '50px', padding: isMobile ? '6px 10px' : '6px 14px 6px 8px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {/* Avatar circle */}
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: institutional ? '#e2e8f0' : 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(124,58,255,0.3))',
                border: institutional ? '1px solid #cbd5e1' : '1px solid rgba(0,212,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700', color: 'var(--q-electric)',
                fontFamily: 'var(--font-mono)', flexShrink: 0,
              }}>
                {activeWallet ? activeWallet.accountIndex + 1 : '?'}
              </div>
              {!isMobile && displayName && (
                <span style={{
                  color: institutional ? '#334155' : 'rgba(180,220,255,0.85)', fontSize: '12px', fontWeight: '500',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
                  maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {displayName}
                </span>
              )}
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="rgba(0,212,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: institutional ? '#fff' : 'rgba(2, 8, 24, 0.95)',
                border: institutional ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px', padding: '8px',
                minWidth: '260px',
                boxShadow: institutional ? '0 8px 32px rgba(0,0,0,0.1)' : '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
                backdropFilter: 'blur(40px)',
                zIndex: 100,
                animation: 'dropdown-in 0.18s cubic-bezier(0.16,1,0.3,1)',
              }}>
                <p style={{
                  padding: '4px 12px 10px',
                  fontSize: '10px', fontWeight: '600', letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: institutional ? '#94a3b8' : 'rgba(120,160,220,0.5)',
                  fontFamily: 'var(--font-mono)', margin: 0,
                }}>Accounts</p>

                {wallets.sort((a, b) => a.accountIndex - b.accountIndex).map(w => {
                  const isActive = w.address === activeAddress
                  const name = usernames[w.address] ? `@${usernames[w.address]}` : `Account ${(w.accountIndex ?? 0) + 1}`
                  return (
                    <button
                      key={w.address}
                      onClick={() => switchAccount(w.address)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        background: isActive ? (institutional?'#eff6ff':'rgba(0,212,255,0.06)') : 'transparent',
                        border: `1px solid ${isActive ? (institutional?'#bfdbfe':'rgba(0,212,255,0.18)') : 'transparent'}`,
                        borderRadius: '12px', padding: '10px 12px', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', marginBottom: '2px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
                        }
                      }}
                    >
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: isActive ? (institutional?'#dbeafe':'linear-gradient(135deg,rgba(0,212,255,0.25),rgba(124,58,255,0.2))') : (institutional?'#f1f5f9':'rgba(255,255,255,0.06)'),
                        border: `1px solid ${isActive ? (institutional?'#93c5fd':'rgba(0,212,255,0.3)') : (institutional?'#e2e8f0':'rgba(255,255,255,0.08)')}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: isActive ? 'var(--q-electric)' : 'rgba(180,210,255,0.5)',
                        fontWeight: '700', flexShrink: 0, fontFamily: 'var(--font-mono)',
                      }}>
                        {w.accountIndex + 1}
                      </div>
                      <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                        <p style={{ color: isActive ? (institutional ? '#1d4ed8' : 'var(--q-electric)') : (institutional ? '#334155' : 'rgba(180,210,255,0.7)'), fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                          {name}
                        </p>
                        <p style={{ color: institutional ? '#94a3b8' : 'rgba(120,160,220,0.4)', fontSize: '9px', fontFamily: 'var(--font-mono)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
                          {w.address.slice(0, 16)}···{w.address.slice(-6)}
                        </p>
                      </div>
                      {isActive && (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--q-electric)', flexShrink: 0, boxShadow: '0 0 8px rgba(0,212,255,0.6)' }} />
                      )}
                    </button>
                  )
                })}

                <div style={{ height: '1px', background: institutional ? '#f1f5f9' : 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '10px 12px', color: institutional ? '#475569' : 'rgba(180,210,255,0.6)',
                    fontSize: '13px', fontWeight: '500', fontFamily: 'var(--font-display)',
                    background: 'transparent', border: '1px solid transparent',
                    borderRadius: '12px', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={e => { setDropdownOpen(false); navigate('/vault') }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.background = 'rgba(0,212,255,0.05)'
                    el.style.borderColor = 'rgba(0,212,255,0.12)'
                    el.style.color = 'var(--q-electric)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.background = 'transparent'
                    el.style.borderColor = 'transparent'
                    el.style.color = 'rgba(180,210,255,0.6)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  New account
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </nav>
  )
}

function NavPill({ href, active, onClick, icon, label }: {
  href: string; active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string;
}) {
  return (
    <a
      href={href}
      onClick={e => { e.preventDefault(); onClick() }}
      className={`nav-link${active ? ' active' : ''}`}
      style={{ borderRadius: '50px', padding: '6px 14px', fontSize: '13px', letterSpacing: '0', textTransform: 'none' }}
    >
      {icon}
      {label}
    </a>
  )
}
