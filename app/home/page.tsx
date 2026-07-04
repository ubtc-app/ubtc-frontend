'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { InstitutionalHome } from '../components/InstitutionalHome'
import { ConsumerHome } from '../components/ConsumerHome'
import Image from 'next/image'

// ── Floating QORA — home page only ──────────────────────────────────────────
function HomeQora() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef       = useRef<number | null>(null)
  const [tilt,     setTilt]     = useState({ x: 0, y: 0 })
  const [speaking, setSpeaking] = useState(false)

  // Global mouse tracking — QORA follows the cursor anywhere on the page
  const handleMouse = useCallback((e: MouseEvent) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const cx = window.innerWidth  / 2
      const cy = window.innerHeight / 2
      const dx = (e.clientX - cx) / (window.innerWidth  / 2)
      const dy = (e.clientY - cy) / (window.innerHeight / 2)
      setTilt({ x: dx * 16, y: dy * -11 })
    })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouse, { passive: true })
    // Occasional speaking pulse so lips animate briefly
    const iv = setInterval(() => {
      setSpeaking(true)
      setTimeout(() => setSpeaking(false), 900 + Math.random() * 600)
    }, 6000 + Math.random() * 4000)
    return () => {
      window.removeEventListener('mousemove', handleMouse)
      clearInterval(iv)
    }
  }, [handleMouse])

  const transform = `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 100,
        right: 32,
        width: 220,
        height: 220,
        zIndex: 50,
        pointerEvents: 'none',
        animation: 'qora-bob 4s ease-in-out infinite',
      }}
    >
      {/* Outer glow halo */}
      <div style={{
        position: 'absolute',
        inset: -24,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 60%, rgba(140,60,255,0.22) 0%, rgba(0,180,255,0.10) 45%, transparent 70%)',
        filter: 'blur(18px)',
        animation: 'qora-halo 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Tilt wrapper */}
      <div style={{
        width: '100%', height: '100%',
        transform,
        transition: 'transform 0.14s cubic-bezier(0.23,1,0.32,1)',
        transformStyle: 'preserve-3d',
        position: 'relative',
      }}>
        <Image
          src="/qora.png"
          alt="QORA"
          fill
          style={{ objectFit: 'contain', mixBlendMode: 'screen', userSelect: 'none', pointerEvents: 'none' }}
          priority
        />

        {/* Eye glow */}
        <div style={{
          position: 'absolute',
          top: '36%', left: '50%',
          transform: 'translateX(-50%)',
          width: '54%', height: '10%',
          background: 'radial-gradient(ellipse at 30% 50%, rgba(160,80,255,0.5) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(160,80,255,0.5) 0%, transparent 60%)',
          animation: 'qora-eye-glow 2.4s ease-in-out infinite',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }} />

        {/* Lip overlay */}
        {speaking && (
          <div style={{
            position: 'absolute',
            top: '63.5%', left: '50%',
            transform: 'translateX(-50%)',
            width: '20%', height: '3.5%',
            background: 'rgba(180,160,155,0.5)',
            borderRadius: '50%',
            animation: 'qora-lips 0.14s ease-in-out infinite',
            transformOrigin: 'center',
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          }} />
        )}

        {/* Ambient chin glow */}
        <div style={{
          position: 'absolute',
          bottom: '8%', left: '50%',
          transform: 'translateX(-50%)',
          width: '60%', height: '12%',
          background: 'radial-gradient(ellipse, rgba(140,60,255,0.35) 0%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }} />
      </div>

      <style>{`
        @keyframes qora-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes qora-halo {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes qora-eye-glow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1.0; }
        }
        @keyframes qora-lips {
          0%   { transform: translateX(-50%) scaleY(1);   }
          30%  { transform: translateX(-50%) scaleY(2.8); }
          60%  { transform: translateX(-50%) scaleY(0.7); }
          100% { transform: translateX(-50%) scaleY(1.9); }
        }
      `}</style>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [theme, setTheme] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('qufi_theme')
    if (t) {
      setTheme(t)
    } else {
      const ut = localStorage.getItem('qufi_user_type')
      setTheme(ut === 'institutional' ? 'light' : 'futuristic')
    }
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <>
      {theme === 'light' ? <InstitutionalHome /> : <ConsumerHome />}
    </>
  )
}
