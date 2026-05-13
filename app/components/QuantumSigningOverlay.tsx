'use client'
import { useEffect, useState } from 'react'

export function QuantumSigningOverlay() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const onStart = () => setActive(true)
    const onEnd = () => setActive(false)
    window.addEventListener('quantum-signing-start', onStart)
    window.addEventListener('quantum-signing-end', onEnd)
    return () => {
      window.removeEventListener('quantum-signing-start', onStart)
      window.removeEventListener('quantum-signing-end', onEnd)
    }
  }, [])

  if (!active) return null

  const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'hsl(220 15% 3% / 0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div style={{
        background: 'hsl(220 15% 6%)',
        border: '1px solid hsl(205 85% 55% / 0.25)',
        borderRadius: '20px', padding: '40px 32px', maxWidth: '420px', width: '100%',
        boxShadow: '0 0 80px hsl(205 85% 55% / 0.15)', textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px', margin: '0 auto 24px',
          border: '3px solid hsl(205 85% 55% / 0.15)',
          borderTopColor: 'hsl(205 85% 55%)',
          borderRadius: '50%',
          animation: 'qspin 1s linear infinite'
        }} />
        <h2 style={{
          color: 'hsl(205 85% 65%)', fontSize: '18px', margin: '0 0 12px',
          fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.02em'
        }}>
          Quantum Signing in Progress
        </h2>
        <p style={{ color: 'hsl(0 0% 70%)', fontSize: '13px', ...mono, margin: '0 0 16px', lineHeight: 1.6 }}>
          Generating Dilithium3 + SPHINCS+ signatures. This typically takes 15–25 seconds.
        </p>
        <p style={{ color: 'hsl(0 0% 40%)', fontSize: '11px', ...mono, margin: 0, letterSpacing: '0.04em' }}>
          Please do not close this page. If your browser asks to wait, click Wait.
        </p>
      </div>
      <style>{`@keyframes qspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}