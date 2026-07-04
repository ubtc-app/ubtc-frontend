'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function InstitutionalUnlock() {
  const router   = useRouter()
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const name = typeof window !== 'undefined' ? localStorage.getItem('qufi_name') || '' : ''

  const handleUnlock = useCallback(() => {
    if (!password) return
    setLoading(true); setError('')
    setTimeout(() => {
      if (password === 'N@k@m0t0') {
        sessionStorage.setItem('wlb_auth', '1')
        router.push('/home')
      } else {
        setError('Credentials not recognised. Please try again.')
        setPassword('')
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      setLoading(false)
    }, 700)
  }, [password, router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f6f8',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
    }}>

      {/* Left panel — branding */}
      <div style={{
        width: 420, flexShrink: 0,
        background: '#0f1923',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 48px',
      }} className="inst-left-panel">
        {/* Logo area */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 64 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #c8a84b, #a8882b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>QuFi</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 4, letterSpacing: '0.08em' }}>INSTITUTIONAL</span>
          </div>

          <h2 style={{
            color: '#fff', fontSize: 28, fontWeight: 300,
            lineHeight: 1.4, margin: '0 0 20px',
            letterSpacing: '-0.02em',
          }}>
            Post-Quantum<br />
            <span style={{ fontWeight: 700 }}>Asset Security</span><br />
            Infrastructure
          </h2>

          <p style={{
            color: 'rgba(255,255,255,0.45)', fontSize: 13,
            lineHeight: 1.75, margin: 0, fontWeight: 300,
          }}>
            Institutional-grade Bitcoin custody with distributed signing authority and post-quantum cryptographic controls.
          </p>
        </div>

        {/* Compliance badges */}
        <div>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>
            Cryptographic Standards
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'FIPS 204', desc: 'ML-DSA-65 Owner Authority' },
              { label: 'FIPS 205', desc: 'SLH-DSA Backup Signing' },
              { label: 'BIP 340', desc: 'Schnorr / Taproot Bitcoin' },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  background: 'rgba(200,168,75,0.15)',
                  border: '1px solid rgba(200,168,75,0.3)',
                  color: '#c8a84b',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                  padding: '3px 8px', borderRadius: 4,
                  fontFamily: 'monospace', flexShrink: 0,
                }}>{b.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{b.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <p style={{
              color: '#94a3b8', fontSize: 12,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              margin: '0 0 12px', fontWeight: 500,
            }}>Secure Access</p>
            <h1 style={{
              color: '#0f172a', fontSize: 30, fontWeight: 700,
              margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2,
            }}>
              {name ? `Welcome back, ${name}.` : 'Welcome back.'}
            </h1>
            <p style={{
              color: '#64748b', fontSize: 14, margin: '10px 0 0',
              fontWeight: 400, lineHeight: 1.6,
            }}>
              Sign in to access your institutional platform.
            </p>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{
                display: 'block', color: '#374151',
                fontSize: 13, fontWeight: 500, marginBottom: 7,
              }}>
                Access Passphrase
              </label>
              <input
                ref={inputRef}
                type="password"
                value={password}
                autoFocus
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                placeholder="Enter your passphrase"
                style={{
                  display: 'block', width: '100%',
                  padding: '13px 16px',
                  background: '#fff',
                  border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: 8,
                  color: '#0f172a', fontSize: 15,
                  fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  letterSpacing: password ? '0.15em' : '0',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#1e3a5f'
                  e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.08)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = error ? '#ef4444' : '#d1d5db'
                  e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                }}
              />
              {error && (
                <p style={{ color: '#ef4444', fontSize: 12, margin: '7px 0 0', fontWeight: 400 }}>
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleUnlock}
              disabled={!password || loading}
              style={{
                width: '100%', padding: '14px',
                background: password && !loading ? '#0f1923' : '#f1f5f9',
                color: password && !loading ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: password && !loading ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', letterSpacing: '-0.01em',
                transition: 'background 0.2s, color 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'inst-spin 0.7s linear infinite',
                  }} />
                  Verifying
                </>
              ) : 'Sign In'}
            </button>

            {/* Security notice */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6, margin: 0 }}>
                This session is protected by post-quantum cryptography. Your signing keys never leave your device.
              </p>
            </div>
          </div>

          {/* Switch profile */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
            <button
              onClick={() => { localStorage.removeItem('qufi_user_type'); localStorage.removeItem('qufi_name'); router.push('/') }}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#94a3b8', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Switch profile
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes inst-spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .inst-left-panel { display: none !important; } }
      `}</style>
    </div>
  )
}
