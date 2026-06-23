'use client'
import { useEffect, useState } from 'react'

export function QuantumSigningOverlay() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const onStart = () => setActive(true)
    const onEnd   = () => setActive(false)
    window.addEventListener('quantum-signing-start', onStart)
    window.addEventListener('quantum-signing-end',   onEnd)
    return () => {
      window.removeEventListener('quantum-signing-start', onStart)
      window.removeEventListener('quantum-signing-end',   onEnd)
    }
  }, [])

  if (!active) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--t-bg)',
      backdropFilter: 'blur(12px) saturate(120%)',
      WebkitBackdropFilter: 'blur(12px) saturate(120%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      opacity: 0, animation: 'fade-in 0.2s ease 0s forwards',
    }}>

      <div style={{
        background: 'var(--t-surface)',
        border: '1px solid var(--t-accent-border)',
        borderRadius: '28px', padding: '48px 40px',
        maxWidth: '400px', width: '100%',
        boxShadow: 'var(--t-glow), var(--t-shadow-xl)',
        textAlign: 'center',
      }}>

        {/* Face ID-style concentric rings */}
        <div style={{ position: 'relative', width: '88px', height: '88px', margin: '0 auto 32px' }}>
          {/* outer ring */}
          <div style={{
            position: 'absolute', inset: '0',
            border: '2px solid var(--t-accent)',
            borderTopColor: 'transparent', borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1.4s linear infinite',
          }} />
          {/* mid ring */}
          <div style={{
            position: 'absolute', inset: '10px',
            border: '2px solid var(--t-accent)',
            borderBottomColor: 'transparent', borderLeftColor: 'transparent',
            borderRadius: '50%', opacity: 0.55,
            animation: 'spin-rev 1.1s linear infinite',
          }} />
          {/* inner ring */}
          <div style={{
            position: 'absolute', inset: '20px',
            border: '1.5px solid var(--t-accent)',
            borderTopColor: 'transparent',
            borderRadius: '50%', opacity: 0.3,
            animation: 'spin 0.8s linear infinite',
          }} />
          {/* pulse core */}
          <div style={{
            position: 'absolute', inset: '30px',
            borderRadius: '50%',
            background: 'var(--t-accent-bg)',
            border: '1px solid var(--t-accent-border)',
            animation: 'pulse-ring 2s ease infinite',
          }} />
        </div>

        <h2 style={{
          color: 'var(--t-accent)', fontSize: '17px', margin: '0 0 10px',
          fontFamily: 'var(--font-display)', fontWeight: '700', letterSpacing: '-0.01em',
        }}>
          Quantum Signing
        </h2>
        <p style={{ color: 'var(--t-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)', margin: '0 0 8px', lineHeight: '1.65' }}>
          Generating Dilithium3 + SPHINCS+ signatures.<br />
          This typically takes 15–25 seconds.
        </p>
        <p style={{ color: 'var(--t-faint)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '0.02em' }}>
          Do not close this page. If your browser asks to wait, click Wait.
        </p>
      </div>
    </div>
  )
}
