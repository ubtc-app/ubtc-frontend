'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Unlock() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [focused, setFocused] = useState(false)

  const handleUnlock = () => {
    if (!password) return
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (password === 'N@k@m0t0') {
        sessionStorage.setItem('wlb_auth', '1')
        router.push('/home')
      } else {
        setError('Access denied — invalid credentials')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        setPassword('')
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--q-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Dot grid */}
      <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />

      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124,58,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Scan line animation */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)',
        animation: 'scan 6s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* Back link */}
      <a href="/" style={{
        position: 'absolute', top: '28px', left: '32px',
        display: 'flex', alignItems: 'center', gap: '6px',
        color: 'var(--q-text-3)', fontSize: '10px',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.14em',
        textTransform: 'uppercase', textDecoration: 'none',
        transition: 'color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--q-electric)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--q-text-3)')}
      >
        ← Return
      </a>

      {/* System tag */}
      <div style={{
        position: 'absolute', top: '28px', right: '32px',
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--q-green)', animation: 'breathe 2s ease-in-out infinite' }} />
        <span style={{ color: 'var(--q-text-3)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>System Online</span>
      </div>

      {/* Main panel */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '420px',
        animation: shake ? 'shake 0.5s cubic-bezier(.36,.07,.19,.97)' : 'fade-in 0.6s ease both',
      }}>

        {/* Header label */}
        <p style={{
          textAlign: 'center', marginBottom: '32px',
          color: 'var(--q-text-3)', fontSize: '9px',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.3em', textTransform: 'uppercase',
        }}>
          UBTC · Quantum Financial Infrastructure
        </p>

        {/* Glass card */}
        <div style={{
          background: 'rgba(5, 12, 35, 0.7)',
          border: `1px solid ${error ? 'rgba(255,56,96,0.35)' : focused ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.12)'}`,
          borderRadius: '24px',
          padding: '48px 40px 40px',
          backdropFilter: 'blur(60px) saturate(200%)',
          WebkitBackdropFilter: 'blur(60px) saturate(200%)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 40px 100px rgba(0,0,0,0.8),
            0 8px 32px rgba(0,0,0,0.5),
            ${focused ? '0 0 60px rgba(0,212,255,0.08)' : 'none'}
          `,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>

          {/* Lock icon */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 20px',
              borderRadius: '18px',
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(0,212,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
              animation: 'float 4s ease-in-out infinite',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--q-electric)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-syne)',
              fontSize: '26px', fontWeight: '800',
              letterSpacing: '-0.03em',
              color: 'var(--q-text)',
              margin: '0 0 8px',
            }}>
              Restricted Access
            </h1>
            <p style={{
              color: 'var(--q-text-3)', fontSize: '11px',
              fontFamily: 'var(--font-mono)', lineHeight: '1.7',
              letterSpacing: '0.04em',
            }}>
              Enter your access key to continue
            </p>
          </div>

          {/* Input */}
          <div style={{ position: 'relative', marginBottom: error ? '10px' : '20px' }}>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="············"
              autoFocus
              style={{
                display: 'block', width: '100%',
                padding: '16px 20px',
                background: 'rgba(0,5,25,0.7)',
                border: `1px solid ${error ? 'rgba(255,56,96,0.5)' : focused ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.15)'}`,
                borderRadius: '14px',
                color: 'var(--q-text)',
                fontSize: '22px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '0.35em',
                boxSizing: 'border-box',
                boxShadow: focused
                  ? '0 0 0 3px rgba(0,212,255,0.1), 0 0 20px rgba(0,212,255,0.1)'
                  : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'rgba(255,56,96,0.08)',
              border: '1px solid rgba(255,56,96,0.2)',
              borderRadius: '10px', padding: '10px 14px',
              marginBottom: '16px',
            }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--q-red)', flexShrink: 0 }} />
              <p style={{ color: 'var(--q-red)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '0.04em' }}>{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleUnlock}
            disabled={!password || loading}
            style={{
              width: '100%',
              background: password && !loading
                ? 'linear-gradient(135deg, var(--q-electric) 0%, #0099cc 100%)'
                : 'rgba(255,255,255,0.04)',
              color: password && !loading ? '#000' : 'var(--q-text-3)',
              border: password && !loading ? 'none' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '13px', fontWeight: '800',
              fontFamily: 'var(--font-syne)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: password && !loading ? 'pointer' : 'not-allowed',
              boxShadow: password && !loading
                ? '0 0 30px rgba(0,212,255,0.35), 0 4px 14px rgba(0,0,0,0.4)'
                : 'none',
              transition: 'all 0.25s',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Verifying
              </span>
            ) : 'Unlock →'}
          </button>
        </div>

        {/* Bottom hint */}
        <p style={{
          textAlign: 'center', marginTop: '24px',
          color: 'var(--q-text-3)', fontSize: '9px',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          FIPS 204 · FIPS 205 · Post-Quantum
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%  { transform: translateX(-10px); }
          30%  { transform: translateX(9px); }
          45%  { transform: translateX(-7px); }
          60%  { transform: translateX(6px); }
          75%  { transform: translateX(-4px); }
          90%  { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}
