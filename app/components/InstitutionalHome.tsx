'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { label: 'Overview', href: '/home', active: true },
  { label: 'Accounts', href: '/dashboard' },
  { label: 'Custody Vault', href: '/vault' },
  { label: 'Transfers', href: '/transfer' },
  { label: 'Audit Trail', href: '/proofs/transfer' },
]

const MODULES = [
  {
    href: '/dashboard',
    title: 'Digital Asset Accounts',
    subtitle: 'View holdings, balances and transaction history across all accounts.',
    tag: 'Accounts',
    tagColor: '#1e3a5f',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.8" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    href: '/vault',
    title: 'Custody Vault',
    subtitle: 'Manage Bitcoin holdings under post-quantum authorised custody.',
    tag: 'Custody',
    tagColor: '#c8a84b',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8a84b" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    href: '/transfer',
    title: 'Authorise Transfer',
    subtitle: 'Initiate and sign a transfer request with post-quantum owner authority.',
    tag: 'Operations',
    tagColor: '#16a34a',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
  },
  {
    href: '/proofs/transfer',
    title: 'Audit & Compliance',
    subtitle: 'View cryptographic proof records and signing event logs.',
    tag: 'Audit',
    tagColor: '#7c3aed',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
]

const STATUS_ROWS = [
  { label: 'Owner Authority', value: 'ML-DSA-65', status: 'active' },
  { label: 'Signing Threshold', value: '2 of 3 Signatories', status: 'active' },
  { label: 'Cryptographic Standard', value: 'FIPS 204 / FIPS 205', status: 'active' },
  { label: 'Bitcoin Network', value: 'Mainnet · Taproot P2TR', status: 'active' },
  { label: 'Quantum Migration', value: 'Not yet enabled', status: 'pending' },
]

export function InstitutionalHome() {
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    const auth = sessionStorage.getItem('wlb_auth')
    if (!auth) router.replace('/unlock')
    setName(localStorage.getItem('qufi_name') || '')
  }, [router])

  const now = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f6f8',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
    }}>

      {/* Top nav bar */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, position: 'sticky', top: 64, zIndex: 10,
      }}>
        <nav style={{ display: 'flex', gap: 0 }}>
          {NAV_ITEMS.map(item => (
            <a key={item.label} href={item.href} style={{
              padding: '0 18px', height: 56,
              display: 'flex', alignItems: 'center',
              color: item.active ? '#0f172a' : '#64748b',
              fontSize: 13, fontWeight: item.active ? 600 : 400,
              textDecoration: 'none',
              borderBottom: item.active ? '2px solid #0f172a' : '2px solid transparent',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#0f172a' }}
            onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#64748b' }}
            >{item.label}</a>
          ))}
        </nav>

        <button
          onClick={() => { sessionStorage.removeItem('wlb_auth'); router.push('/') }}
          style={{
            background: 'none', border: '1px solid #e2e8f0',
            borderRadius: 6, padding: '6px 14px',
            color: '#64748b', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'; (e.currentTarget as HTMLElement).style.color = '#374151' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b' }}
        >
          Sign Out
        </button>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 48px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px', letterSpacing: '0.04em' }}>{now}</p>
          <h1 style={{
            color: '#0f172a', fontSize: 32, fontWeight: 700,
            margin: '0 0 10px', letterSpacing: '-0.03em',
          }}>
            {name ? `Good morning, ${name}.` : 'Good morning.'}
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0, fontWeight: 400 }}>
            Your assets are secured. All systems operational.
          </p>
        </div>

        {/* Security status card */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '28px 32px',
          marginBottom: 32,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h2 style={{ color: '#0f172a', fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>
                Security Status
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                Post-quantum cryptographic controls
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 20, padding: '6px 14px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
              <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0' }}>
            {STATUS_ROWS.map((row, i) => (
              <div key={row.label} style={{
                padding: '16px 0',
                borderTop: i !== 0 ? '1px solid #f1f5f9' : 'none',
                gridColumn: '1 / -1',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 400 }}>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    color: '#0f172a', fontSize: 13, fontWeight: 500,
                    fontFamily: row.label.includes('Standard') || row.label.includes('Network') ? 'monospace' : 'inherit',
                  }}>{row.value}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: row.status === 'active' ? '#f0fdf4' : '#fefce8',
                    color: row.status === 'active' ? '#16a34a' : '#ca8a04',
                    border: `1px solid ${row.status === 'active' ? '#bbf7d0' : '#fde68a'}`,
                  }}>
                    {row.status === 'active' ? 'Active' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action modules */}
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ color: '#0f172a', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>
            Platform Modules
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {MODULES.map(mod => (
              <a key={mod.href} href={mod.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: '28px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#cbd5e1'
                  el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#e2e8f0'
                  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                  el.style.transform = 'none'
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: `${mod.tagColor}0f`,
                      border: `1px solid ${mod.tagColor}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {mod.icon}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: mod.tagColor,
                      background: `${mod.tagColor}0f`,
                      border: `1px solid ${mod.tagColor}22`,
                      padding: '3px 9px', borderRadius: 20,
                    }}>{mod.tag}</span>
                  </div>
                  <h3 style={{
                    color: '#0f172a', fontSize: 15, fontWeight: 600,
                    margin: '0 0 8px', letterSpacing: '-0.01em',
                  }}>{mod.title}</h3>
                  <p style={{
                    color: '#64748b', fontSize: 12, lineHeight: 1.65, margin: 0,
                  }}>{mod.subtitle}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Disclosure */}
        <div style={{
          marginTop: 48, paddingTop: 24,
          borderTop: '1px solid #e2e8f0',
        }}>
          <p style={{
            color: '#94a3b8', fontSize: 11, lineHeight: 1.7, margin: 0,
            maxWidth: 700,
          }}>
            <strong style={{ color: '#64748b' }}>Important notice:</strong> Bitcoin consensus currently uses secp256k1 cryptography. QuFi adds post-quantum owner authorisation and distributed signing controls at the application layer. It does not modify Bitcoin consensus or claim to make Bitcoin transactions quantum resistant.
          </p>
        </div>
      </div>
    </div>
  )
}
