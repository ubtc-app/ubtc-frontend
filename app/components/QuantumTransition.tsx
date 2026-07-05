'use client'
import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface QTCtxType {
  navigate: (href: string, ox?: number, oy?: number) => void
}

const QTCtx = createContext<QTCtxType>({ navigate: () => {} })
export const useQuantumNav = () => useContext(QTCtx)

const COLORS = ['#00d4ff', '#7c3aff', '#00ffe0', '#a78bfa', '#ffffff', '#00b4ff', '#ff44aa']

// Static particle layout — generated once, repositioned by CSS per click origin
const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const angle  = (i / 26) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
  const dist   = 70 + Math.random() * 130
  const size   = 2.5 + Math.random() * 4.5
  const isSquare = i % 3 === 0
  return {
    id:    i,
    tx:    Math.cos(angle) * dist,
    ty:    Math.sin(angle) * dist,
    size,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.08,
    dur:   0.32 + Math.random() * 0.18,
    square: isSquare,
  }
})

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

// ── Overlay ──────────────────────────────────────────────────────────────────
function TransitionOverlay({ ox, oy, phase }: { ox: number; oy: number; phase: 'in' | 'out' }) {
  const inst = isInstitutional()
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      pointerEvents: 'none',
      opacity: phase === 'out' ? 0 : 1,
      transition: phase === 'out' ? 'opacity 0.38s ease' : 'none',
    }}>
      <style>{`
        @keyframes qt-bloom  {
          from { transform:translate(-50%,-50%) scale(0); opacity:0 }
          18%  { opacity:1 }
          to   { transform:translate(-50%,-50%) scale(1);   opacity:0 }
        }
        @keyframes qt-ring   {
          from { transform:translate(-50%,-50%) scale(0.1); opacity:1 }
          to   { transform:translate(-50%,-50%) scale(6);   opacity:0 }
        }
        @keyframes qt-pt     {
          from { transform:translate(-50%,-50%) translate(0,0)                     scale(1.4); opacity:1 }
          to   { transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) scale(0);   opacity:0 }
        }
        @keyframes qt-bg     {
          0%   { opacity:0 }
          25%  { opacity:1 }
          100% { opacity:1 }
        }
        @keyframes qt-page-in {
          from { opacity:0; filter:brightness(1.8) blur(8px); transform:scale(1.025) }
          to   { opacity:1; filter:brightness(1)   blur(0px); transform:scale(1) }
        }
      `}</style>

      {/* Flash — momentary background */}
      <div style={{
        position: 'fixed', inset: 0,
        background: inst
          ? 'radial-gradient(ellipse 120% 120% at 50% 50%, rgba(241,245,249,0.82) 0%, rgba(226,232,240,0.92) 100%)'
          : 'radial-gradient(ellipse 120% 120% at 50% 50%, rgba(0,2,16,0.85) 0%, rgba(0,0,8,0.95) 100%)',
        animation: 'qt-bg 0.42s ease forwards',
      }} />

      {/* Radial bloom from origin */}
      <div style={{
        position: 'fixed', left: ox, top: oy,
        width: '250vmax', height: '250vmax',
        borderRadius: '50%',
        background: inst
          ? `radial-gradient(circle, rgba(29,78,216,0.10) 0%, rgba(124,58,237,0.05) 35%, transparent 65%)`
          : `radial-gradient(circle, rgba(0,100,255,0.22) 0%, rgba(100,0,255,0.1) 35%, transparent 65%)`,
        animation: 'qt-bloom 0.5s ease forwards',
        pointerEvents: 'none',
      }} />

      {/* Expanding quantum rings */}
      {[
        { delay: '0s',    color: 'rgba(0,212,255,0.85)',  w: 60  },
        { delay: '0.05s', color: 'rgba(124,58,255,0.6)',  w: 100 },
        { delay: '0.10s', color: 'rgba(0,255,224,0.4)',   w: 150 },
      ].map((ring, i) => (
        <div key={i} style={{
          position: 'fixed', left: ox, top: oy,
          width: ring.w, height: ring.w,
          borderRadius: '50%',
          border: `1px solid ${ring.color}`,
          boxShadow: `0 0 12px ${ring.color}, inset 0 0 8px ${ring.color}`,
          animation: `qt-ring 0.52s ${ring.delay} ease forwards`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Particle fragments */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'fixed', left: ox, top: oy,
          width: p.size, height: p.size,
          borderRadius: p.square ? '1px' : '50%',
          background: p.color,
          boxShadow: `0 0 ${p.size * 2}px ${p.size}px ${p.color}66`,
          animation: `qt-pt ${p.dur}s ${p.delay}s ease forwards`,
          ['--tx' as string]: `${p.tx}px`,
          ['--ty' as string]: `${p.ty}px`,
          pointerEvents: 'none',
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function QuantumTransitionProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<{ active: boolean; phase: 'in'|'out'; ox: number; oy: number }>({
    active: false, phase: 'in', ox: 0, oy: 0,
  })
  const router = useRouter()
  const navRef = useRef(false)

  const navigate = useCallback((href: string, ox?: number, oy?: number) => {
    if (navRef.current) return
    navRef.current = true
    const x = ox ?? window.innerWidth  / 2
    const y = oy ?? window.innerHeight / 2
    setOverlay({ active: true, phase: 'in', ox: x, oy: y })
    setTimeout(() => router.push(href), 400)
    setTimeout(() => setOverlay(s => ({ ...s, phase: 'out' })), 460)
    setTimeout(() => { setOverlay(s => ({ ...s, active: false })); navRef.current = false }, 840)
  }, [router])

  return (
    <QTCtx.Provider value={{ navigate }}>
      {children}
      {overlay.active && (
        <TransitionOverlay ox={overlay.ox} oy={overlay.oy} phase={overlay.phase} />
      )}
    </QTCtx.Provider>
  )
}
