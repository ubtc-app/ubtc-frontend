'use client'
import { useEffect, useState, useMemo } from 'react'

const STAR_COUNT = 110
const COLORS = ['#00d4ff', '#7c3aff', '#00ffe0', '#ffffff', '#a78bfa']

// ── Clean institutional signing modal ────────────────────────────────────────
function InstitutionalSigningOverlay() {
  const [dots, setDots] = useState('.')
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'inst-fadein 0.25s ease forwards',
    }}>
      <style>{`@keyframes inst-fadein { from{opacity:0} to{opacity:1} }`}</style>
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '40px 48px',
        textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
        maxWidth: 420, width: '90%',
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}>
        {/* Spinner */}
        <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 24px' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid #e2e8f0',
            borderTopColor: '#0f172a',
            animation: 'inst-spin 0.9s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 8, borderRadius: '50%',
            border: '2px solid #f1f5f9',
            borderTopColor: '#1e40af',
            animation: 'inst-spin 1.3s linear infinite reverse',
          }} />
          <style>{`@keyframes inst-spin { to { transform: rotate(360deg) } }`}</style>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 20, padding: '4px 14px', marginBottom: 20,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'inst-pulse 1.2s ease-in-out infinite' }} />
          <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>
            SIGNING ACTIVE
          </span>
          <style>{`@keyframes inst-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }`}</style>
        </div>

        <h2 style={{ color: '#0f172a', fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Authorising Transaction{dots}
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.65, margin: '0 0 24px' }}>
          Generating post-quantum signatures using ML-DSA-65 + SLH-DSA-SHAKE-256s.
        </p>

        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 8, padding: '12px 16px', textAlign: 'left',
        }}>
          <p style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', margin: 0, lineHeight: 1.7 }}>
            FIPS 204 · FIPS 205<br />
            <span style={{ color: '#dc2626', fontWeight: 600 }}>Do not close this window</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function QuantumSigningOverlay() {
  const [active, setActive] = useState(false)
  const [tick,   setTick]   = useState(0)
  const [institutional, setInstitutional] = useState(false)

  useEffect(() => {
    const checkTheme = () => setInstitutional(
      localStorage.getItem('qufi_theme') === 'light' ||
      localStorage.getItem('qufi_user_type') === 'institutional'
    )
    checkTheme()
    window.addEventListener('qufi-profile-changed', checkTheme)
    return () => window.removeEventListener('qufi-profile-changed', checkTheme)
  }, [])

  useEffect(() => {
    const onStart = () => { setActive(true);  setTick(t => t + 1) }
    const onEnd   = () => setActive(false)
    window.addEventListener('quantum-signing-start', onStart)
    window.addEventListener('quantum-signing-end',   onEnd)
    return () => {
      window.removeEventListener('quantum-signing-start', onStart)
      window.removeEventListener('quantum-signing-end',   onEnd)
    }
  }, [])

  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => {
    const angle    = (i / STAR_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.18
    const endDist  = 520 + Math.random() * 380
    const dur      = 1.2 + Math.random() * 2.2
    return {
      id: i,
      tx:    `${Math.cos(angle) * endDist}px`,
      ty:    `${Math.sin(angle) * endDist}px`,
      dur:   `${dur}s`,
      delay: `${-(Math.random() * dur)}s`,
      size:  1 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
      glow:  i % 5 === 0,
    }
  }), [tick])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null
  if (institutional) return <InstitutionalSigningOverlay />

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #020820 0%, #000308 60%, #000208 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      animation: 'qs-fadein 0.35s ease forwards',
    }}>
      <style>{`
        @keyframes qs-fadein  { from { opacity:0 } to { opacity:1 } }
        @keyframes qs-warp    { 0% { transform:translate(-50%,-50%) translate(0,0) scale(1); opacity:0 }
                                 6% { opacity:1 }
                                 80%{ opacity:.7 }
                                 100%{ transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) scale(1) scaleY(6); opacity:0 } }
        @keyframes qs-spin-a  { to { transform: rotate(360deg) } }
        @keyframes qs-spin-b  { to { transform: rotate(-360deg) } }
        @keyframes qs-breathe { 0%,100%{ transform:scale(1); opacity:.9 } 50%{ transform:scale(1.12); opacity:1 } }
        @keyframes qs-pulse   { 0%,100%{ transform:scale(1);   box-shadow:0 0 30px rgba(0,212,255,.35) }
                                  50%  { transform:scale(1.08); box-shadow:0 0 60px rgba(0,212,255,.65) } }
        @keyframes qs-badge   { 0%,100%{ letter-spacing:.28em; opacity:.85 } 50%{ letter-spacing:.34em; opacity:1 } }
        @keyframes qs-scan    { 0%{ transform:translateY(-100%) } 100%{ transform:translateY(100vh) } }
      `}</style>

      {/* ── Warp star field ── */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute', top: '50%', left: '50%',
          width:  `${s.size}px`,
          height: `${s.size}px`,
          background: s.color,
          borderRadius: '50%',
          boxShadow: s.glow ? `0 0 6px 2px ${s.color}` : 'none',
          animation: `qs-warp ${s.dur} ${s.delay} linear infinite`,
          ['--tx' as any]: s.tx,
          ['--ty' as any]: s.ty,
          pointerEvents: 'none',
        }} />
      ))}

      {/* ── Scan line ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px', top: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,.15) 30%, rgba(124,58,255,.2) 50%, rgba(0,212,255,.15) 70%, transparent 100%)',
        animation: 'qs-scan 6s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* ── Central quantum rings ── */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
        {/* Ring 1 */}
        <div style={{
          position: 'absolute', width: 200, height: 200,
          marginTop: -100, marginLeft: -100,
          border: '1px solid rgba(0,212,255,.25)',
          borderRadius: '50%',
          animation: 'qs-spin-a 4s linear infinite',
        }}>
          <div style={{ position: 'absolute', top: -4, left: '48%', width: 8, height: 8, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 12px 4px rgba(0,212,255,.8)' }} />
        </div>
        {/* Ring 2 */}
        <div style={{
          position: 'absolute', width: 140, height: 140,
          marginTop: -70, marginLeft: -70,
          border: '1px solid rgba(124,58,255,.3)',
          borderRadius: '50%',
          transform: 'rotateX(70deg)',
          animation: 'qs-spin-b 3s linear infinite',
        }}>
          <div style={{ position: 'absolute', bottom: -4, left: '45%', width: 7, height: 7, borderRadius: '50%', background: '#7c3aff', boxShadow: '0 0 10px 3px rgba(124,58,255,.8)' }} />
        </div>
        {/* Ring 3 */}
        <div style={{
          position: 'absolute', width: 100, height: 100,
          marginTop: -50, marginLeft: -50,
          border: '1px solid rgba(0,255,224,.2)',
          borderRadius: '50%',
          transform: 'rotateY(70deg)',
          animation: 'qs-spin-a 2.2s linear infinite',
        }}>
          <div style={{ position: 'absolute', top: '10%', right: -4, width: 6, height: 6, borderRadius: '50%', background: '#00ffe0', boxShadow: '0 0 8px 3px rgba(0,255,224,.8)' }} />
        </div>
        {/* Core */}
        <div style={{
          position: 'absolute', width: 48, height: 48,
          marginTop: -24, marginLeft: -24,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,150,255,.9) 0%, rgba(80,0,255,.6) 50%, transparent 100%)',
          animation: 'qs-pulse 2.2s ease-in-out infinite',
        }} />
      </div>

      {/* ── Text card ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        textAlign: 'center',
        marginTop: 180,
        padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,212,255,.08)',
          border: '1px solid rgba(0,212,255,.25)',
          borderRadius: 40, padding: '6px 18px',
          marginBottom: 20,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 10px #00d4ff' }} />
          <span style={{
            color: '#00d4ff', fontSize: '9px', fontFamily: 'var(--font-mono)',
            letterSpacing: '.28em', textTransform: 'uppercase',
            animation: 'qs-badge 2s ease-in-out infinite',
          }}>Quantum Signing Active</span>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-syne)',
          fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800,
          letterSpacing: '.06em', textTransform: 'uppercase',
          margin: '0 0 14px',
          background: 'linear-gradient(135deg, #e8f4ff 0%, #00d4ff 50%, #7c3aff 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Quantum Signing
        </h2>

        <p style={{ color: 'rgba(160,200,255,.65)', fontSize: 13, fontFamily: 'var(--font-mono)', margin: '0 0 6px', lineHeight: 1.7 }}>
          Generating ML-DSA-65 + SLH-DSA-SHAKE-256s signatures.
        </p>
        <p style={{ color: 'rgba(120,160,220,.4)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '.04em' }}>
          FIPS 204 · FIPS 205 · Do not close this window
        </p>
      </div>
    </div>
  )
}
