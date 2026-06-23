'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '../components/Icons'
import { SiteLogo } from '../components/SiteLogo'

const tags = [
  { label: 'UBTC',           color: 'var(--t-orange)' },
  { label: 'UUSDT',          color: 'var(--t-green)' },
  { label: 'UUSDC',          color: 'var(--t-accent)' },
  { label: 'Quantum Secured',color: 'var(--t-purple)' },
  { label: 'Taproot Assets', color: 'var(--t-accent)' },
]

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('wlb_auth')
      if (!auth) router.replace('/unlock')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--t-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px',
      fontFamily: 'var(--font-display)',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: '32px', animation: 'fade-in 0.5s ease both' }}>
        <SiteLogo height={44} />
      </div>

      {/* Headline */}
      <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fade-up 0.5s ease 0.05s both' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '700', margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: '1.1', color: 'var(--t-text)' }}>
          Bitcoin-Native Banking{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--t-accent), hsl(190 80% 50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            For Everyone
          </span>
        </h1>
        <p style={{ color: 'var(--t-muted)', fontSize: '14px', fontFamily: 'var(--font-mono)', margin: '0 0 20px', lineHeight: '1.7', maxWidth: '420px' }}>
          Hold, send and receive Bitcoin-backed stablecoins.<br />
          Quantum-secured. Self-custody. No banks required.
        </p>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <span key={tag.label} className="pill" style={{ color: tag.color, borderColor: tag.color + '35', background: tag.color + '0d' }}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* Action cards */}
      <div style={{
        display: 'flex', gap: '14px', width: '100%', maxWidth: '720px',
        flexWrap: 'wrap', justifyContent: 'center',
        marginBottom: '40px', animation: 'fade-up 0.5s ease 0.12s both',
      }}>

        {/* Go to Accounts */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            flex: '1 1 200px', minWidth: '180px',
            background: 'linear-gradient(135deg, var(--t-accent) 0%, hsl(190 80% 50%) 100%)',
            color: 'white', border: 'none', borderRadius: '20px',
            padding: '24px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
            cursor: 'pointer', fontFamily: 'var(--font-display)',
            boxShadow: 'var(--t-glow)',
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.accounts(24, 'white')}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'white', fontWeight: '700', fontSize: '15px', margin: '0 0 5px' }}>Go to Accounts</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0, lineHeight: '1.5' }}>View your UBTC,<br />UUSDT and UUSDC</p>
          </div>
        </button>

        {/* Create Account */}
        <button
          onClick={() => router.push('/vault')}
          className="card"
          style={{
            flex: '1 1 200px', minWidth: '180px',
            borderRadius: '20px', padding: '24px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
            cursor: 'pointer', fontFamily: 'var(--font-display)', border: 'none',
            background: 'var(--t-surface)',
            transition: 'opacity 0.15s, transform 0.1s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--t-accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.vault(24, 'var(--t-accent)')}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--t-text)', fontWeight: '700', fontSize: '15px', margin: '0 0 5px' }}>Create Account</p>
            <p style={{ color: 'var(--t-faint)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0, lineHeight: '1.5' }}>Current, Savings,<br />Yield or Managed</p>
          </div>
        </button>

      </div>

      {/* Sign out */}
      <button
        onClick={() => { sessionStorage.removeItem('wlb_auth'); router.push('/') }}
        style={{ background: 'none', border: 'none', color: 'var(--t-faint)', fontSize: '11px', fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.1em', padding: '8px 16px' }}
      >
        Sign out
      </button>
    </div>
  )
}
