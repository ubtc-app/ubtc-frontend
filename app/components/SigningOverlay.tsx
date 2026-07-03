'use client'
import { useState, useEffect, useMemo } from 'react'

type Stage = '' | 'signing' | 'broadcasting'
interface SigningOverlayProps {
  stage: Stage
  tokenColor?: string
  tokenName?: string
  amount?: string
  context?: string
}

const STAR_COUNT = 120
const STAR_COLORS = ['#00d4ff', '#7c3aff', '#00ffe0', '#ffffff', '#a78bfa', '#00b4ff']

const PHASE_COPY = {
  decrypting: {
    eyebrow: 'PHASE 01 · KEY RETRIEVAL',
    title: 'Unlocking Quantum Keys',
    sub: 'Unwrapping your post-quantum signing key from your\n24-word recovery phrase. Never leaves this device.',
    ringColor: '#00d4ff',
    coreColor: 'rgba(0,150,255,.9)',
  },
  signing: {
    eyebrow: 'PHASE 02 · QUANTUM SIGNING',
    title: 'Signing Across Dimensions',
    sub: 'ML-DSA-65 + SLH-DSA-SHAKE-256s signature forming.\nFIPS 204 · FIPS 205 · This takes a few seconds.',
    ringColor: '#7c3aff',
    coreColor: 'rgba(100,0,255,.9)',
  },
  broadcasting: {
    eyebrow: 'PHASE 03 · TRANSMISSION',
    title: 'Transmitting to Bitcoin',
    sub: 'Quantum-signed transaction broadcast to the network.\nYour journey through the protocol is almost complete.',
    ringColor: '#00ffe0',
    coreColor: 'rgba(0,200,180,.9)',
  },
}

export function SigningOverlay({
  stage,
  tokenColor = 'var(--q-electric)',
  tokenName  = 'UBTC',
  amount,
  context    = 'Authorizing transaction',
}: SigningOverlayProps) {
  const [quantumActive, setQuantumActive] = useState(false)

  useEffect(() => {
    const start = () => setQuantumActive(true)
    const end   = () => setQuantumActive(false)
    window.addEventListener('quantum-signing-start', start)
    window.addEventListener('quantum-signing-end',   end)
    return () => {
      window.removeEventListener('quantum-signing-start', start)
      window.removeEventListener('quantum-signing-end',   end)
    }
  }, [])

  useEffect(() => {
    if (!stage) return
    const block = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', block)
    return () => window.removeEventListener('beforeunload', block)
  }, [stage])

  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => {
    const angle   = (i / STAR_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.2
    const endDist = 480 + Math.random() * 420
    const dur     = 1.0 + Math.random() * 2.4
    return {
      id:    i,
      tx:    `${Math.cos(angle) * endDist}px`,
      ty:    `${Math.sin(angle) * endDist}px`,
      dur:   `${dur}s`,
      delay: `${-(Math.random() * dur)}s`,
      w:     1 + Math.random() * 1.5,
      color: STAR_COLORS[i % STAR_COLORS.length],
      glow:  i % 4 === 0,
    }
  }), [])

  if (!stage) return null

  type Phase = 'decrypting' | 'signing' | 'broadcasting'
  const phase: Phase =
    stage === 'broadcasting' ? 'broadcasting' :
    quantumActive            ? 'signing'      : 'decrypting'

  const copy = PHASE_COPY[phase]

  return (
    <div
      role="alert" aria-live="assertive" aria-busy="true"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'radial-gradient(ellipse 90% 80% at 50% 50%, #010a1e 0%, #000308 55%, #000208 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        animation: 'so-in .3s ease forwards',
        fontFamily: 'var(--font-display)',
      }}
    >
      <style>{`
        @keyframes so-in     { from{opacity:0} to{opacity:1} }
        @keyframes so-warp   { 0%  { transform:translate(-50%,-50%) translate(0,0) scaleY(1); opacity:0 }
                                6%  { opacity:1 }
                                80% { opacity:.65 }
                                100%{ transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) scaleY(7); opacity:0 } }
        @keyframes so-spin-a { to { transform: rotate(360deg)  } }
        @keyframes so-spin-b { to { transform: rotate(-360deg) } }
        @keyframes so-pulse  { 0%,100%{ transform:scale(1);    box-shadow:0 0 40px var(--core-c) }
                                  50% { transform:scale(1.15); box-shadow:0 0 80px var(--core-c) } }
        @keyframes so-badge  { 0%,100%{ opacity:.7; letter-spacing:.26em }
                                  50% { opacity:1;  letter-spacing:.32em } }
        @keyframes so-scan   { 0%  { transform:translateY(-100%) }
                               100%{ transform:translateY(100vh)  } }
        @keyframes so-bar    { 0%  { transform:scaleX(0) }
                               100%{ transform:scaleX(1) } }
        @keyframes so-phase  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Warp stars ── */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: `${s.w}px`, height: `${s.w}px`,
          background: s.color, borderRadius: '50%',
          boxShadow: s.glow ? `0 0 5px 2px ${s.color}` : 'none',
          animation: `so-warp ${s.dur} ${s.delay} linear infinite`,
          ['--tx' as any]: s.tx,
          ['--ty' as any]: s.ty,
          pointerEvents: 'none',
        }} />
      ))}

      {/* ── Ambient scan line ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2, top: 0,
        background: 'linear-gradient(90deg,transparent,rgba(0,212,255,.12) 30%,rgba(124,58,255,.18) 50%,rgba(0,212,255,.12) 70%,transparent)',
        animation: 'so-scan 7s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* ── Central quantum rings ── */}
      <div style={{ position: 'relative', width: 0, height: 0, marginBottom: 160 }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute', width: 220, height: 220,
          marginTop: -110, marginLeft: -110,
          border: `1px solid ${copy.ringColor}30`,
          borderRadius: '50%',
          animation: 'so-spin-a 5s linear infinite',
        }}>
          <div style={{ position: 'absolute', top: -5, left: '47%', width: 9, height: 9, borderRadius: '50%', background: copy.ringColor, boxShadow: `0 0 14px 5px ${copy.ringColor}99` }} />
          <div style={{ position: 'absolute', bottom: -5, left: '47%', width: 6, height: 6, borderRadius: '50%', background: copy.ringColor, boxShadow: `0 0 8px 3px ${copy.ringColor}80` }} />
        </div>
        {/* Mid ring — tilted */}
        <div style={{
          position: 'absolute', width: 155, height: 155,
          marginTop: -78, marginLeft: -78,
          border: `1px solid ${copy.ringColor}40`,
          borderRadius: '50%',
          transform: 'rotateX(68deg)',
          animation: 'so-spin-b 3.2s linear infinite',
        }}>
          <div style={{ position: 'absolute', top: '8%', right: -5, width: 7, height: 7, borderRadius: '50%', background: copy.ringColor, boxShadow: `0 0 10px 3px ${copy.ringColor}90` }} />
        </div>
        {/* Inner ring — tilted other axis */}
        <div style={{
          position: 'absolute', width: 100, height: 100,
          marginTop: -50, marginLeft: -50,
          border: `1px solid ${copy.ringColor}55`,
          borderRadius: '50%',
          transform: 'rotateY(72deg)',
          animation: 'so-spin-a 2s linear infinite',
        }}>
          <div style={{ position: 'absolute', bottom: '10%', left: -5, width: 6, height: 6, borderRadius: '50%', background: '#00ffe0', boxShadow: '0 0 8px 3px rgba(0,255,224,.8)' }} />
        </div>
        {/* Glowing core */}
        <div style={{
          position: 'absolute', width: 52, height: 52,
          marginTop: -26, marginLeft: -26,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${copy.coreColor} 0%, rgba(40,0,120,.5) 60%, transparent 100%)`,
          ['--core-c' as any]: copy.ringColor + '80',
          animation: 'so-pulse 2s ease-in-out infinite',
          transition: 'background .8s ease',
        }} />
      </div>

      {/* ── Text section ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 24px 48px',
        background: 'linear-gradient(0deg, rgba(0,2,12,.95) 60%, transparent 100%)',
        zIndex: 2,
      }}>
        {/* Context + amount */}
        {amount && (
          <p style={{ color: 'rgba(120,160,220,.45)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            {context} · {parseFloat(amount).toLocaleString()} {tokenName}
          </p>
        )}
        {!amount && (
          <p style={{ color: 'rgba(120,160,220,.45)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            {context}
          </p>
        )}

        {/* Eyebrow badge */}
        <div key={phase} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: `${copy.ringColor}12`,
          border: `1px solid ${copy.ringColor}35`,
          borderRadius: 40, padding: '5px 16px', marginBottom: 14,
          animation: 'so-phase .4s ease forwards',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: copy.ringColor, boxShadow: `0 0 10px ${copy.ringColor}` }} />
          <span style={{
            color: copy.ringColor, fontSize: '9px', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', animation: 'so-badge 2.2s ease-in-out infinite',
          }}>{copy.eyebrow}</span>
        </div>

        {/* Title */}
        <h2 key={phase + '-h'} style={{
          fontFamily: 'var(--font-syne)', fontWeight: 800,
          fontSize: 'clamp(20px,4vw,30px)', letterSpacing: '.04em',
          textTransform: 'uppercase', margin: '0 0 12px',
          background: `linear-gradient(135deg, #e8f4ff 0%, ${copy.ringColor} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          animation: 'so-phase .4s ease forwards',
        }}>
          {copy.title}
        </h2>

        {/* Subtitle */}
        <p style={{ color: 'rgba(150,190,255,.55)', fontSize: 12, fontFamily: 'var(--font-mono)', margin: '0 0 24px', lineHeight: 1.75, textAlign: 'center', whiteSpace: 'pre-line' }}>
          {copy.sub}
        </p>

        {/* Phase progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, width: '100%', maxWidth: 320 }}>
          <PhaseStep label="Decrypt"  state={phase === 'decrypting' ? 'active' : 'done'} color={PHASE_COPY.decrypting.ringColor} />
          <PhaseBar done={phase !== 'decrypting'} color={PHASE_COPY.signing.ringColor} />
          <PhaseStep label="Sign"     state={phase === 'decrypting' ? 'pending' : phase === 'signing' ? 'active' : 'done'} color={PHASE_COPY.signing.ringColor} />
          <PhaseBar done={phase === 'broadcasting'} color={PHASE_COPY.broadcasting.ringColor} />
          <PhaseStep label="Submit"   state={phase === 'broadcasting' ? 'active' : 'pending'} color={PHASE_COPY.broadcasting.ringColor} />
        </div>

        {/* Do not close warning */}
        <p style={{ color: 'rgba(80,110,160,.5)', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '.16em', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
          Do not close this window · Quantum signing in progress
        </p>
      </div>
    </div>
  )
}

function PhaseStep({ label, state, color }: { label: string; state: 'pending'|'active'|'done'; color: string }) {
  const c = state === 'done' ? '#00ffe0' : state === 'active' ? color : 'rgba(80,100,140,.4)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: '0 0 auto' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `2px solid ${c}`,
        background: state === 'done' ? '#00ffe0' : state === 'active' ? `${color}18` : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: state === 'done' ? '#000' : c,
        fontWeight: 700, transition: 'all .3s ease',
        boxShadow: state === 'active' ? `0 0 20px ${color}60` : 'none',
        animation: state === 'active' ? 'so-pulse 1.6s ease-in-out infinite' : 'none',
        ['--core-c' as any]: color + '50',
      }}>
        {state === 'done' ? '✓' : state === 'active' ? '◉' : ''}
      </div>
      <span style={{ fontSize: 8, color: c, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{label}</span>
    </div>
  )
}

function PhaseBar({ done, color }: { done: boolean; color: string }) {
  return (
    <div style={{ flex: 1, height: 1, background: 'rgba(60,80,120,.25)', position: 'relative', overflow: 'hidden' }}>
      {done && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, #00ffe0, ${color})`,
          animation: 'so-bar .5s ease forwards',
          transformOrigin: 'left',
        }} />
      )}
    </div>
  )
}
