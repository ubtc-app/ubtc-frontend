'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SiteLogo } from '../components/SiteLogo'

export default function Unlock() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const mono: any = { fontFamily: 'var(--font-mono)' }

  const handleUnlock = () => {
    if (!password) return
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (password === 'N@k@m0t0') {
        sessionStorage.setItem('wlb_auth', '1')
        router.push('/home')
      } else {
        setError('Access denied. Check your credentials.')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        setPassword('')
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>

      {/* Logo */}
      <div style={{ marginBottom: '36px' }}>
        <SiteLogo height={40} />
      </div>

      {/* Lock box */}
      <div style={{ maxWidth: '400px', width: '100%', background: 'var(--t-surface)', border: `1px solid ${error ? 'hsl(0 84% 60% / 0.4)' : 'var(--t-border)'}`, borderRadius: '22px', padding: '40px 36px', textAlign: 'center' as const, transition: 'border-color 0.3s', animation: shake ? 'shake 0.5s' : 'none' }}>

        {/* Lock icon */}
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--t-surface2)', border: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>
          🔐
        </div>

        <h2 style={{ color: 'var(--t-text)', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' }}>Restricted Access</h2>
        <p style={{ color: 'var(--t-faint)', fontSize: '12px', ...mono, margin: '0 0 28px', lineHeight: '1.6' }}>
          Enter your access key to continue
        </p>

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="············"
          autoFocus
          style={{ display: 'block', width: '100%', padding: '14px 18px', background: 'var(--t-surface2)', border: `1px solid ${error ? 'hsl(0 84% 60% / 0.5)' : 'var(--t-border)'}`, borderRadius: '12px', color: 'var(--t-text)', fontSize: '20px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '14px', textAlign: 'center' as const, letterSpacing: '0.3em', transition: 'border-color 0.2s' }}
        />

        {error && (
          <p style={{ color: 'var(--t-red)', fontSize: '12px', ...mono, margin: '0 0 14px' }}>{error}</p>
        )}

        <button
          onClick={handleUnlock}
          disabled={!password || loading}
          style={{ width: '100%', background: password && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'var(--t-border-subtle)', color: password && !loading ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '14px', fontWeight: '700', cursor: password && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', boxShadow: password && !loading ? '0 0 30px hsl(205 85% 55% / 0.3)' : 'none', transition: 'all 0.2s' }}
        >
          {loading ? 'Verifying...' : 'Unlock →'}
        </button>

        <a href="/" style={{ display: 'block', color: 'hsl(0 0% 22%)', fontSize: '11px', ...mono, textDecoration: 'none', marginTop: '20px' }}>← Back</a>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}