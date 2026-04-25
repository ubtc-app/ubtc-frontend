'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '../components/Icons'

export default function Home() {
  const router = useRouter()
  const mono: any = { fontFamily: 'var(--font-mono)' }

  // Auth check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('wlb_auth')
      if (!auth) router.replace('/unlock')
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>

      {/* Logo */}
      <div style={{ marginBottom: '28px' }}>
        <img src="/worldlocalbanklogo.png" alt="World Local Bank" style={{ height: '42px', objectFit: 'contain' }} />
      </div>

      {/* Headline */}
      <div style={{ textAlign: 'center' as const, marginBottom: '36px' }}>
        <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '34px', fontWeight: '700', margin: '0 0 10px', letterSpacing: '-0.5px', lineHeight: '1.1' }}>
          Bitcoin-Native Banking{' '}
          <span style={{ background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            For Everyone
          </span>
        </h1>
        <p style={{ color: 'hsl(0 0% 32%)', fontSize: '14px', ...mono, margin: '0 0 16px', lineHeight: '1.7' }}>
          Hold, send and receive Bitcoin-backed stablecoins.<br />
          Quantum-secured. Self-custody. No banks required.
        </p>
        <div style={{ display: 'flex', gap: '7px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
          {[
            { label: 'UBTC', color: 'hsl(38 92% 50%)' },
            { label: 'UUSDT', color: 'hsl(142 76% 36%)' },
            { label: 'UUSDC', color: 'hsl(220 85% 60%)' },
            { label: 'Quantum Secured', color: 'hsl(205 85% 55%)' },
            { label: 'Taproot Assets', color: 'hsl(270 85% 65%)' },
          ].map(t => (
            <span key={t.label} style={{ fontSize: '10px', ...mono, color: t.color, border: `1px solid ${t.color}28`, borderRadius: '20px', padding: '3px 11px', background: t.color + '08' }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Three buttons */}
      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '680px', flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: '32px' }}>

        <button
          onClick={() => router.push('/dashboard')}
          style={{ flex: '1 1 180px', minWidth: '170px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '18px', padding: '22px 16px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '12px', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 40px hsl(205 85% 55% / 0.25)', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.accounts(24, 'white')}
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <p style={{ color: 'white', fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>Go to Accounts</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>View your UBTC,<br />UUSDT and UUSDC</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/vault')}
          style={{ flex: '1 1 180px', minWidth: '170px', background: 'hsl(220 12% 8%)', color: 'white', border: '1px solid hsl(220 10% 14%)', borderRadius: '18px', padding: '22px 16px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '12px', cursor: 'pointer', fontFamily: 'var(--font-display)', transition: 'border-color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(220 10% 25%)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(220 10% 14%)')}
        >
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'hsl(220 12% 13%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.vault(24, 'hsl(205 85% 55%)')}
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>Create Account</p>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>Current, Savings,<br />Yield or Managed</p>
          </div>
        </button>

        

      </div>

      {/* Sign out */}
      <button
        onClick={() => { sessionStorage.removeItem('wlb_auth'); router.push('/') }}
        style={{ background: 'none', border: 'none', color: 'hsl(0 0% 20%)', fontSize: '11px', ...mono, cursor: 'pointer', letterSpacing: '0.1em' }}
      >
        Sign out
      </button>

    </div>
  )
}