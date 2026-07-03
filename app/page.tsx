'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const ParticleWaves = dynamic(() => import('@/components/ui/threejs-particles-waves'), { ssr: false })

export default function LandingPage() {
  const enteringRef = useRef(false)
  const router      = useRouter()
  const [entering, setEntering] = useState(false)

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (enteringRef.current) return
    enteringRef.current = true
    setEntering(true)
    const rect = e.currentTarget.getBoundingClientRect()
    window.dispatchEvent(new CustomEvent('qt-burst', { detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } }))
    setTimeout(() => router.push('/unlock'), 1600)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000208', overflow: 'hidden', cursor: entering ? 'none' : 'default' }}>

      {/* ── Particle wave background ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <ParticleWaves
          initialDensity={45}
          initialSpeed={0.07}
          initialAmplitude={60}
          initialSeparation={110}
          initialParticleColor="#00d4ff"
          initialBgColor="#000208"
          showControls={false}
        />
      </div>

      {/* ── Secondary colour layer — violet / teal tint ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 80%, rgba(124,58,255,0.18) 0%, transparent 70%)',
      }} />

      {/* ── Vignette ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 20%, rgba(0,1,8,0.75) 100%)',
      }} />

      {/* ── Scanlines ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />

      {/* ── Entry flash ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(100,160,255,1), white)',
        opacity: entering ? 1 : 0,
        transition: entering ? 'opacity 0.5s ease 1.2s' : 'none',
        zIndex: 30,
      }} />

      {/* ── Main UI ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        padding: '0 24px',
      }}>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '36px',
          opacity: entering ? 0 : 1, transition: 'opacity 0.4s',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 12px 3px #00ffcc88' }} />
          <span style={{ color: 'rgba(0,220,200,0.55)', fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.32em', textTransform: 'uppercase' }}>
            QAP · QUANTUM FINANCIAL INFRASTRUCTURE · ONLINE
          </span>
        </div>

        {/* Headline with chromatic aberration */}
        <div style={{ textAlign: 'center', marginBottom: '18px', opacity: entering ? 0 : 1, transition: 'opacity 0.4s' }}>
          <p style={{ color: 'rgba(120,160,255,0.45)', fontSize: 'clamp(9px,1.1vw,11px)', fontFamily: 'monospace', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '22px' }}>
            Welcome to the new
          </p>
          <h1 style={{
            fontFamily: "'Oxanium', monospace",
            fontSize: 'clamp(32px,5.5vw,72px)', fontWeight: 800,
            letterSpacing: '0.06em', lineHeight: 1.0, margin: 0,
            textTransform: 'uppercase', position: 'relative',
            filter: 'drop-shadow(0 0 40px rgba(0,100,255,0.4))',
          }}>
            <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#00d4ff 0%,#7c3aff 50%,#00ffe0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', transform: 'translate(-2px,0)', opacity: 0.35, userSelect: 'none' }} aria-hidden>Quantum Financial<br />System</span>
            <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#ff00aa 0%,#00ffee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', transform: 'translate(2px,0)', opacity: 0.25, userSelect: 'none' }} aria-hidden>Quantum Financial<br />System</span>
            <span style={{ background: 'linear-gradient(135deg,#e8f4ff 0%,rgba(140,200,255,0.9) 40%,#7c3aff 75%,#00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', position: 'relative', display: 'block' }}>
              Quantum Financial<br />System
            </span>
          </h1>
        </div>

        {/* Divider */}
        <div style={{
          width: 'clamp(120px,20vw,280px)', height: 1, marginBottom: '28px',
          background: 'linear-gradient(90deg,transparent,rgba(0,180,255,0.6),rgba(124,58,255,0.6),transparent)',
          opacity: entering ? 0 : 1, transition: 'opacity 0.4s',
          boxShadow: '0 0 12px rgba(0,150,255,0.4)',
        }} />

        {/* Spec pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '52px', opacity: entering ? 0 : 1, transition: 'opacity 0.4s' }}>
          {['FIPS 204', 'FIPS 205', 'FIPS 203', 'Taproot', 'Bitcoin-Native'].map(tag => (
            <span key={tag} style={{
              color: 'rgba(100,180,255,0.65)', fontSize: '8px', fontFamily: 'monospace',
              letterSpacing: '0.18em', border: '1px solid rgba(0,120,255,0.25)', borderRadius: '20px',
              padding: '4px 12px', textTransform: 'uppercase', background: 'rgba(0,20,60,0.35)',
              backdropFilter: 'blur(8px)', boxShadow: '0 0 10px rgba(0,80,255,0.08)',
            }}>{tag}</span>
          ))}
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          style={{
            pointerEvents: entering ? 'none' : 'auto',
            background: 'rgba(0,10,40,0.45)',
            border: '1px solid rgba(0,180,255,0.5)',
            color: 'rgba(120,210,255,0.95)',
            borderRadius: '50px', padding: '18px 72px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.35em',
            textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'monospace',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 0 50px rgba(0,120,255,0.15),0 0 100px rgba(80,0,255,0.08),inset 0 1px 0 rgba(120,210,255,0.15)',
            opacity: entering ? 0 : 1,
            transition: 'opacity 0.4s,box-shadow 0.3s,border-color 0.3s,transform 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.boxShadow = '0 0 80px rgba(0,160,255,0.35),0 0 140px rgba(80,0,255,0.15),inset 0 1px 0 rgba(120,210,255,0.2)'
            el.style.borderColor = 'rgba(0,210,255,0.8)'
            el.style.transform = 'scale(1.04)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.boxShadow = '0 0 50px rgba(0,120,255,0.15),0 0 100px rgba(80,0,255,0.08),inset 0 1px 0 rgba(120,210,255,0.15)'
            el.style.borderColor = 'rgba(0,180,255,0.5)'
            el.style.transform = 'scale(1)'
          }}
        >
          Enter
        </button>
      </div>
    </div>
  )
}
