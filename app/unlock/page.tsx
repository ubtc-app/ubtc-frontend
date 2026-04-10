'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>

      {/* Logo */}
      <div style={{ marginBottom: '36px' }}>
        <img src="/worldlocalbanklogo.png" alt="World Local Bank" style={{ height: '40px', objectFit: 'contain' }} />
      </div>

      {/* Lock box */}
      <div style={{ maxWidth: '400px', width: '100%', background: 'hsl(220 15% 5%)', border: `1px solid ${error ? 'hsl(0 84% 60% / 0.4)' : 'hsl(220 10% 13%)'}`, borderRadius: '22px', padding: '40px 36px', textAlign: 'center' as const, transition: 'border-color 0.3s', animation: shake ? 'shake 0.5s' : 'none' }}>

        {/* Lock icon */}
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(220 12% 9%)', border: '1px solid hsl(220 10% 16%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>
          🔐
        </div>

        <h2 style={{ color: 'hsl(0 0% 88%)', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' }}>Restricted Access</h2>
        <p style={{ color: 'hsl(0 0% 30%)', fontSize: '12px', ...mono, margin: '0 0 28px', lineHeight: '1.6' }}>
          Enter your access key to continue
        </p>

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="············"
          autoFocus
          style={{ display: 'block', width: '100%', padding: '14px 18px', background: 'hsl(220 15% 7%)', border: `1px solid ${error ? 'hsl(0 84% 60% / 0.5)' : 'hsl(220 10% 15%)'}`, borderRadius: '12px', color: 'hsl(0 0% 88%)', fontSize: '20px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '14px', textAlign: 'center' as const, letterSpacing: '0.3em', transition: 'border-color 0.2s' }}
        />

        {error && (
          <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '0 0 14px' }}>{error}</p>
        )}

        <button
          onClick={handleUnlock}
          disabled={!password || loading}
          style={{ width: '100%', background: password && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 11%)', color: password && !loading ? 'white' : 'hsl(0 0% 25%)', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '14px', fontWeight: '700', cursor: password && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', boxShadow: password && !loading ? '0 0 30px hsl(205 85% 55% / 0.3)' : 'none', transition: 'all 0.2s' }}
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