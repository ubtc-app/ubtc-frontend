'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${5 + Math.random() * 90}%`,
  size: 2 + Math.random() * 3,
  dur: `${7 + Math.random() * 10}s`,
  delay: `${Math.random() * 12}s`,
  drift: `${(Math.random() - 0.5) * 80}px`,
  color: i % 3 === 0 ? '#00D4FF' : i % 3 === 1 ? '#7C3AFF' : '#00FFE0',
  glow:  i % 3 === 0 ? 'rgba(0,212,255,0.8)' : i % 3 === 1 ? 'rgba(124,58,255,0.8)' : 'rgba(0,255,224,0.8)',
}))

export function ConsumerUnlock() {
  const router    = useRouter()
  const cardRef   = useRef<HTMLDivElement>(null)
  const rafRef    = useRef<number | null>(null)
  const [inst,     setInst]     = useState(false)
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [shake,    setShake]    = useState(false)
  const [focused,  setFocused]  = useState(false)

  useEffect(() => { setInst(isInstitutional()) }, [])

  const handleUnlock = () => {
    if (!password) return
    setLoading(true); setError('')
    setTimeout(() => {
      if (password === 'N@k@m0t0') {
        sessionStorage.setItem('wlb_auth', '1')
        window.location.href = '/home'
      } else {
        setError('Biometric mismatch — access denied')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        setPassword('')
      }
      setLoading(false)
    }, 700)
  }

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (inst) return
    const card = cardRef.current
    if (!card) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 22
      const y = ((e.clientY - r.top)  / r.height - 0.5) * -22
      card.style.transform = `perspective(1000px) rotateX(${y}deg) rotateY(${x}deg) translateZ(8px)`
    })
  }, [inst])

  const onMouseLeave = useCallback(() => {
    const card = cardRef.current
    if (!card) return
    card.style.transition = 'transform 0.6s cubic-bezier(0.23,1,0.32,1)'
    card.style.transform  = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
    setTimeout(() => { if (card) card.style.transition = 'transform 0.08s ease' }, 600)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: inst ? '#f5f7fa' : 'var(--q-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px', position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-display)',
    }}>

      {/* Dark mode background effects */}
      {!inst && (
        <>
          <div className="q-vortex-scene">
            <div className="q-glow-node" style={{ top: '10%', left: '15%', width: 500, height: 500, background: 'rgba(0,212,255,0.06)' }} />
            <div className="q-glow-node" style={{ bottom: '5%', right: '10%', width: 600, height: 600, background: 'rgba(124,58,255,0.07)' }} />
            <div className="q-glow-node" style={{ top: '40%', right: '25%', width: 300, height: 300, background: 'rgba(0,255,224,0.04)' }} />
            <div className="q-circuit-grid" style={{ position: 'absolute', inset: 0 }} />
            <div className="q-scanline" />
            <div className="q-ring-1" /><div className="q-ring-2" /><div className="q-ring-3" /><div className="q-vortex-core" />
            <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none' }}>
              <div className="q-energy-ring" /><div className="q-energy-ring" /><div className="q-energy-ring" />
            </div>
            {PARTICLES.map(p => (
              <div key={p.id} className="q-particle" style={{
                left: p.left, bottom: '-10px', width: p.size, height: p.size,
                background: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.glow}`,
                '--dur': p.dur, '--delay': p.delay, '--drift': p.drift,
              } as any} />
            ))}
          </div>
        </>
      )}

      {/* Back link */}
      <a href="/" style={{
        position: 'absolute', top: 28, left: 32,
        color: inst ? '#94a3b8' : 'rgba(120,160,220,0.45)', fontSize: '11px',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.18em',
        textTransform: 'uppercase', textDecoration: 'none', zIndex: 10, transition: 'color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = inst ? '#1d4ed8' : 'var(--q-electric)')}
        onMouseLeave={e => (e.currentTarget.style.color = inst ? '#94a3b8' : 'rgba(120,160,220,0.45)')}
      >← Return</a>

      {/* Status indicator */}
      <div style={{ position: 'absolute', top: 28, right: 32, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: inst ? '#16a34a' : 'var(--q-green)', boxShadow: inst ? 'none' : '0 0 10px var(--q-green)', animation: 'breathe 2s ease-in-out infinite' }} />
        <span style={{ color: inst ? '#94a3b8' : 'rgba(120,160,220,0.45)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          {inst ? 'Secure Access' : 'QAP · SECURE NODE'}
        </span>
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440 }}>
        {!inst && (
          <p className="warp-in" style={{ textAlign: 'center', marginBottom: 28, color: 'rgba(0,212,255,0.4)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.35em', textTransform: 'uppercase' }}>
            UBTC · QUANTUM FINANCIAL INFRASTRUCTURE · v3.0
          </p>
        )}
        {inst && (
          <p style={{ textAlign: 'center', marginBottom: 24, color: '#94a3b8', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            UBTC · Post-Quantum Financial Infrastructure
          </p>
        )}

        <div
          ref={cardRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
          className={inst ? '' : `q-holo warp-in-d1 ${shake ? 'q-border-pulse' : ''}`}
          style={inst ? {
            background: '#fff',
            border: `1px solid ${error ? '#fca5a5' : focused ? '#93c5fd' : '#e2e8f0'}`,
            borderRadius: 24,
            padding: 'clamp(28px, 6vw, 48px) clamp(20px, 8vw, 40px) clamp(24px, 5vw, 40px)',
            boxShadow: focused
              ? '0 0 0 3px rgba(59,130,246,0.12), 0 8px 32px rgba(0,0,0,0.08)'
              : '0 4px 24px rgba(0,0,0,0.08)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          } : {
            background: 'var(--q-surface)',
            border: `1px solid ${error ? 'rgba(255,56,96,0.4)' : focused ? 'var(--q-electric)' : 'var(--q-border)'}`,
            borderRadius: 28,
            padding: 'clamp(28px, 6vw, 52px) clamp(20px, 8vw, 44px) clamp(24px, 5vw, 44px)',
            backdropFilter: 'blur(60px) saturate(200%)', WebkitBackdropFilter: 'blur(60px) saturate(200%)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,212,255,0.04), 0 50px 120px rgba(0,0,0,0.9), 0 0 80px rgba(0,212,255,0.06), ${focused ? '0 0 50px rgba(0,212,255,0.12)' : 'none'}`,
            transition: 'border-color 0.3s, box-shadow 0.3s', transformStyle: 'preserve-3d',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}>
              {/* Lock icon container */}
              {inst ? (
                <div style={{ width: 64, height: 64, borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              ) : (
                <>
                  <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.2)', animation: 'vortex-cw 5s linear infinite' }}>
                    <div style={{ position: 'absolute', top: '8%', right: '12%', width: 6, height: 6, borderRadius: '50%', background: 'var(--q-electric)', boxShadow: '0 0 12px 4px rgba(0,212,255,0.8)' }} />
                  </div>
                  <div style={{ position: 'absolute', inset: -28, borderRadius: '50%', border: '1px solid rgba(124,58,255,0.15)', animation: 'vortex-ccw 8s linear infinite' }}>
                    <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: 4, height: 4, borderRadius: '50%', background: 'var(--q-violet)', boxShadow: '0 0 10px 3px rgba(124,58,255,0.8)' }} />
                  </div>
                  <div className="q-float-3d" style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(124,58,255,0.08))', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0,212,255,0.2), 0 0 60px rgba(0,212,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="url(#lockGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <defs><linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00D4FF" /><stop offset="100%" stopColor="#7C3AFF" /></linearGradient></defs>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </>
              )}
            </div>

            {inst ? (
              <>
                <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 800, letterSpacing: '0.02em', color: '#0f172a', margin: '12px 0 6px' }}>
                  Secure Access
                </h1>
                <p style={{ color: '#64748b', fontSize: '11px', fontFamily: 'var(--font-mono)', lineHeight: 1.7, letterSpacing: '0.06em', margin: 0 }}>
                  FIPS 204 · FIPS 205 · Post-Quantum Secured
                </p>
              </>
            ) : (
              <>
                <h1 className="q-chromatic" style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'linear-gradient(135deg, #f0f6ff 30%, rgba(0,212,255,0.9) 60%, #7C3AFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 8px' }}>
                  Quantum Access
                </h1>
                <p style={{ color: 'rgba(120,160,220,0.45)', fontSize: '10px', fontFamily: 'var(--font-mono)', lineHeight: 1.7, letterSpacing: '0.1em' }}>
                  FIPS 204 · FIPS 205 · POST-QUANTUM SECURED
                </p>
              </>
            )}
          </div>

          {/* Password input */}
          <div style={{ position: 'relative', marginBottom: error ? 10 : 20 }}>
            <input
              type="password" value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="············" autoFocus
              style={{
                display: 'block', width: '100%', padding: '16px 20px',
                background: inst ? '#f8fafc' : 'rgba(0,3,18,0.8)',
                border: `1px solid ${error
                  ? (inst ? '#fca5a5' : 'rgba(255,56,96,0.5)')
                  : focused
                    ? (inst ? '#93c5fd' : 'rgba(0,212,255,0.55)')
                    : (inst ? '#e2e8f0' : 'rgba(0,212,255,0.15)')}`,
                borderRadius: 14,
                color: inst ? '#0f172a' : 'var(--q-text)',
                fontSize: 20,
                fontFamily: 'var(--font-mono)', outline: 'none', textAlign: 'center',
                letterSpacing: '0.4em', boxSizing: 'border-box',
                boxShadow: inst
                  ? (focused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none')
                  : (focused ? '0 0 0 3px rgba(0,212,255,0.1), 0 0 30px rgba(0,212,255,0.15), inset 0 1px 0 rgba(0,212,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.04)'),
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: inst ? '#fef2f2' : 'rgba(255,56,96,0.07)', border: inst ? '1px solid #fecaca' : '1px solid rgba(255,56,96,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: inst ? '#ef4444' : 'var(--q-red)', flexShrink: 0 }} />
              <p style={{ color: inst ? '#dc2626' : 'var(--q-red)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '0.06em' }}>{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleUnlock} disabled={!password || loading}
            className={inst && password && !loading ? 'inst-btn' : ''}
            style={{
              width: '100%',
              background: password && !loading
                ? (inst ? '#1d4ed8' : 'linear-gradient(135deg, #00D4FF 0%, #0088bb 50%, #7C3AFF 100%)')
                : (inst ? '#f1f5f9' : 'rgba(255,255,255,0.04)'),
              color: password && !loading
                ? '#fff'
                : (inst ? '#94a3b8' : 'rgba(120,160,220,0.3)'),
              border: inst ? 'none' : (password && !loading ? 'none' : '1px solid rgba(255,255,255,0.07)'),
              borderRadius: 14, padding: '16px', fontSize: '13px', fontWeight: 700,
              fontFamily: 'var(--font-syne)', letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: password && !loading ? 'pointer' : 'not-allowed',
              boxShadow: password && !loading
                ? (inst ? '0 4px 16px rgba(29,78,216,0.35)' : '0 0 40px rgba(0,212,255,0.4), 0 0 80px rgba(124,58,255,0.2), 0 4px 20px rgba(0,0,0,0.5)')
                : 'none',
              transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ width: 14, height: 14, border: `2px solid ${inst ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`, borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Authenticating
              </span>
            ) : (inst ? 'Authorise Access →' : 'Initiate Quantum Auth →')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: perspective(1000px) translateX(0); }
          15%  { transform: perspective(1000px) translateX(-12px) rotateY(-3deg); }
          30%  { transform: perspective(1000px) translateX(10px) rotateY(3deg); }
          45%  { transform: perspective(1000px) translateX(-8px) rotateY(-2deg); }
          60%  { transform: perspective(1000px) translateX(7px) rotateY(2deg); }
          75%  { transform: perspective(1000px) translateX(-4px); }
          90%  { transform: perspective(1000px) translateX(3px); }
        }
        .inst-btn:active { transform: scale(0.97) !important; transition: transform 0.08s ease !important; }
      `}</style>
    </div>
  )
}
