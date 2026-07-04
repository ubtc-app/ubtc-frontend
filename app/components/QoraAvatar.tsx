'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'

interface QoraAvatarProps {
  size?: number
  speaking?: boolean
  /** If true, listens to global mousemove; else listens only within the container */
  globalMouse?: boolean
  /** Extra CSS class on the wrapper */
  className?: string
  style?: React.CSSProperties
}

export function QoraAvatar({
  size = 200,
  speaking = false,
  globalMouse = false,
  className,
  style,
}: QoraAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt]   = useState({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)

  // ── Mouse tracking ────────────────────────────────────────────────────────
  const handleMouse = useCallback((clientX: number, clientY: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const cx = window.innerWidth  / 2
      const cy = window.innerHeight / 2
      const dx = (clientX - cx) / (window.innerWidth  / 2)  // -1 … 1
      const dy = (clientY - cy) / (window.innerHeight / 2)  // -1 … 1
      setTilt({ x: dx * 14, y: dy * -10 })
    })
  }, [])

  const handleLocalMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (globalMouse) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const dx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2)
    const dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2)
    setTilt({ x: dx * 18, y: dy * -12 })
  }, [globalMouse])

  const handleMouseLeave = useCallback(() => {
    if (!globalMouse) setTilt({ x: 0, y: 0 })
  }, [globalMouse])

  useEffect(() => {
    if (!globalMouse) return
    const fn = (e: MouseEvent) => handleMouse(e.clientX, e.clientY)
    window.addEventListener('mousemove', fn, { passive: true })
    return () => window.removeEventListener('mousemove', fn)
  }, [globalMouse, handleMouse])

  // Floating bob animation value via CSS
  const transform = `
    perspective(900px)
    rotateY(${tilt.x}deg)
    rotateX(${tilt.y}deg)
    translateZ(0px)
  `

  return (
    <div
      ref={containerRef}
      onMouseMove={handleLocalMouse}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        animation: 'qora-bob 4s ease-in-out infinite',
        ...style,
      }}
    >
      {/* ── QORA image with 3-D tilt ─────────────────────────────────── */}
      <div style={{
        width: '100%', height: '100%',
        transform,
        transition: 'transform 0.12s cubic-bezier(0.23,1,0.32,1)',
        transformStyle: 'preserve-3d',
        position: 'relative',
      }}>
        {/* Remove black background with mix-blend-mode */}
        <Image
          src="/qora.png"
          alt="QORA"
          fill
          style={{ objectFit: 'contain', mixBlendMode: 'screen', userSelect: 'none', pointerEvents: 'none' }}
          priority
        />

        {/* ── Eye glow overlay (purple pulse) ── */}
        <div style={{
          position: 'absolute',
          top: '36%', left: '50%',
          transform: 'translateX(-50%)',
          width: '54%', height: '10%',
          background: 'radial-gradient(ellipse at 30% 50%, rgba(160,80,255,0.45) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(160,80,255,0.45) 0%, transparent 60%)',
          animation: 'qora-eye-glow 2.4s ease-in-out infinite',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }} />

        {/* ── Lip animation overlay ── */}
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

        {/* ── Ambient glow ring under chin ── */}
        <div style={{
          position: 'absolute',
          bottom: '8%', left: '50%',
          transform: 'translateX(-50%)',
          width: '60%', height: '12%',
          background: 'radial-gradient(ellipse, rgba(140,60,255,0.3) 0%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }} />
      </div>

      <style>{`
        @keyframes qora-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes qora-eye-glow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1.0; }
        }
        @keyframes qora-lips {
          0%        { transform: translateX(-50%) scaleY(1);   }
          30%       { transform: translateX(-50%) scaleY(2.8); }
          60%       { transform: translateX(-50%) scaleY(0.7); }
          100%      { transform: translateX(-50%) scaleY(1.9); }
        }
      `}</style>
    </div>
  )
}
