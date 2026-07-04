'use client'
import { useState, useEffect, useCallback } from 'react'
import { QoraAvatar } from './QoraAvatar'

const STEPS = [
  {
    title: "Hi, I'm QORA",
    text: "I'm your Quantum Operational Reasoning Agent. Welcome to QuFi — the post-quantum financial infrastructure. Let me show you around.",
    icon: '✦',
  },
  {
    title: "Home",
    text: "Your command centre. See the live security status of your cryptographic controls, navigate to any module, and check system health at a glance.",
    icon: '⌂',
    href: '/home',
  },
  {
    title: "Accounts",
    text: "View your UBTC, UUSDT and UUSDC balances in real time. Full transaction history and account details — all quantum-secured.",
    icon: '◈',
    href: '/dashboard',
  },
  {
    title: "Custody Vault",
    text: "Secure Bitcoin custody using post-quantum multi-signature thresholds. Your signing keys never leave your device. Protected by FIPS 204 ML-DSA-65.",
    icon: '⬡',
    href: '/vault',
  },
  {
    title: "Authorise Transfer",
    text: "Initiate and sign transfers with distributed threshold signing. Every transaction requires the minimum number of authorised signatories to approve.",
    icon: '→',
    href: '/transfer',
  },
  {
    title: "Audit & Compliance",
    text: "Every signing event produces a cryptographic proof. Tamper-evident records, exportable for regulatory compliance and internal audit.",
    icon: '≡',
    href: '/proofs/transfer',
  },
  {
    title: "You're all set!",
    text: "That's everything. I'll always be here — just tap 'CALL QORA' whenever you need a hand. Stay quantum-secure.",
    icon: '◉',
  },
]

export function QoraPanel() {
  const [open,    setOpen]    = useState(false)
  const [step,    setStep]    = useState(0)
  const [visible, setVisible] = useState(false)   // button slide-up
  const [textIdx, setTextIdx] = useState(0)        // typewriter char index
  const [speaking,setSpeaking]= useState(false)

  // Button eases up after 2s
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [])

  // Typewriter effect per step
  useEffect(() => {
    setTextIdx(0)
    setSpeaking(true)
    const text = STEPS[step].text
    let i = 0
    const iv = setInterval(() => {
      i++
      setTextIdx(i)
      if (i >= text.length) { clearInterval(iv); setSpeaking(false) }
    }, 22)
    return () => { clearInterval(iv); setSpeaking(false) }
  }, [step, open])

  const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), [])
  const next = useCallback(() => setStep(s => Math.min(STEPS.length - 1, s + 1)), [])

  const handleOpen = () => {
    setOpen(true)
    setStep(0)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => setStep(0), 400)
  }

  const currentStep = STEPS[step]
  const displayedText = currentStep.text.slice(0, textIdx)

  return (
    <>
      {/* ── Floating CALL QORA button ── */}
      <div style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 9000,
        transform: visible && !open ? 'translateY(0)' : 'translateY(120px)',
        opacity: visible && !open ? 1 : 0,
        transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
        pointerEvents: visible && !open ? 'auto' : 'none',
      }}>
        <button
          onClick={handleOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, rgba(10,14,24,0.96), rgba(18,10,36,0.96))',
            border: '1px solid rgba(160,80,255,0.4)',
            borderRadius: 50,
            padding: '10px 20px 10px 10px',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(140,60,255,0.25), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.25s',
            animation: 'qora-btn-pulse 3s ease-in-out infinite',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 50px rgba(140,60,255,0.5), 0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)'
            e.currentTarget.style.borderColor = 'rgba(160,80,255,0.7)'
            e.currentTarget.style.transform = 'scale(1.04)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(140,60,255,0.25), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
            e.currentTarget.style.borderColor = 'rgba(160,80,255,0.4)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {/* Mini QORA thumbnail */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#000',
            border: '1px solid rgba(160,80,255,0.4)',
            overflow: 'hidden', position: 'relative', flexShrink: 0,
          }}>
            <img
              src="/qora.png" alt="QORA"
              style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen' }}
            />
          </div>
          <div>
            <p style={{ color: '#dde4ed', fontSize: '12px', fontWeight: 600, margin: 0, letterSpacing: '0.04em', fontFamily: 'inherit' }}>
              CALL QORA
            </p>
            <p style={{ color: 'rgba(160,80,255,0.7)', fontSize: '9px', margin: 0, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
              Your AI Guide
            </p>
          </div>
          {/* Live dot */}
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#a050ff',
            boxShadow: '0 0 8px rgba(160,80,255,0.9)',
            animation: 'qora-live 1.5s ease-in-out infinite',
          }} />
        </button>
      </div>

      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9001,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* ── QORA Guide Panel ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 9002,
        width: 420,
        maxWidth: '100vw',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.55s cubic-bezier(0.34,1.2,0.64,1)',
        borderRadius: '24px 24px 0 0',
        overflow: 'hidden',
      }}>
        {/* Panel background */}
        <div style={{
          background: 'linear-gradient(160deg, rgba(8,6,20,0.98) 0%, rgba(14,6,28,0.98) 100%)',
          border: '1px solid rgba(160,80,255,0.2)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          padding: '0 0 32px',
          boxShadow: '0 -20px 80px rgba(140,60,255,0.2), 0 -4px 40px rgba(0,0,0,0.8)',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Top glow bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(160,80,255,0.8), rgba(100,200,255,0.6), transparent)',
          }} />

          {/* Ambient glow */}
          <div style={{
            position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
            width: 400, height: 300, borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(120,40,220,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a050ff', boxShadow: '0 0 8px rgba(160,80,255,0.9)', animation: 'qora-live 1.5s ease-in-out infinite' }} />
              <span style={{ color: 'rgba(160,80,255,0.7)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                QORA · GUIDE MODE
              </span>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                color: 'rgba(200,200,220,0.5)', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; e.currentTarget.style.color = 'rgba(255,100,100,0.8)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(200,200,220,0.5)' }}
            >✕</button>
          </div>

          {/* QORA + Speech area */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, padding: '8px 24px 0', position: 'relative' }}>
            {/* QORA image */}
            <div style={{ flexShrink: 0, marginBottom: -8 }}>
              <QoraAvatar size={180} speaking={speaking} globalMouse style={{ filter: 'drop-shadow(0 0 30px rgba(140,60,255,0.4))' }} />
            </div>

            {/* Speech bubble */}
            <div style={{
              flex: 1, minWidth: 0,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(160,80,255,0.2)',
              borderRadius: '16px 16px 16px 4px',
              padding: '14px 16px',
              marginBottom: 16,
              marginLeft: -8,
              position: 'relative',
              backdropFilter: 'blur(10px)',
            }}>
              {/* Bubble pointer */}
              <div style={{
                position: 'absolute', left: -7, bottom: 12,
                width: 0, height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderRight: '7px solid rgba(160,80,255,0.2)',
              }} />
              <div style={{
                position: 'absolute', left: -5, bottom: 13,
                width: 0, height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderRight: '6px solid rgba(8,6,20,0.95)',
              }} />

              <p style={{
                color: 'rgba(160,80,255,0.8)', fontSize: '10px',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                margin: '0 0 8px', fontFamily: 'monospace',
              }}>
                {currentStep.icon} {currentStep.title}
              </p>
              <p style={{
                color: 'rgba(210,220,240,0.88)', fontSize: '12.5px',
                lineHeight: 1.7, margin: 0,
                fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
                minHeight: 80,
              }}>
                {displayedText}
                {speaking && (
                  <span style={{
                    display: 'inline-block', width: 2, height: '1em',
                    background: 'rgba(160,80,255,0.7)', marginLeft: 1,
                    verticalAlign: 'text-bottom',
                    animation: 'qora-cursor 0.5s step-end infinite',
                  }} />
                )}
              </p>

              {/* Link to section */}
              {currentStep.href && !speaking && (
                <a
                  href={currentStep.href}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 12,
                    color: 'rgba(160,80,255,0.8)', fontSize: '10px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    textDecoration: 'none', fontFamily: 'monospace',
                    animation: 'fade-up 0.35s ease both',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(200,140,255,1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(160,80,255,0.8)')}
                >
                  Go there now →
                </a>
              )}
            </div>
          </div>

          {/* ── Navigation ── */}
          <div style={{ padding: '4px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    width: i === step ? 20 : 6, height: 6,
                    borderRadius: 3,
                    background: i === step ? 'rgba(160,80,255,0.9)' : 'rgba(255,255,255,0.12)',
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: i === step ? '0 0 8px rgba(160,80,255,0.7)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={prev}
                disabled={step === 0}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, padding: '7px 14px',
                  color: step === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(200,200,220,0.6)',
                  fontSize: '11px', cursor: step === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'monospace', letterSpacing: '0.1em',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (step > 0) e.currentTarget.style.borderColor = 'rgba(160,80,255,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >← Prev</button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={next}
                  style={{
                    background: 'linear-gradient(135deg, rgba(100,40,200,0.5), rgba(60,20,160,0.5))',
                    border: '1px solid rgba(160,80,255,0.4)',
                    borderRadius: 8, padding: '7px 18px',
                    color: 'rgba(200,160,255,0.9)',
                    fontSize: '11px', cursor: 'pointer',
                    fontFamily: 'monospace', letterSpacing: '0.1em',
                    boxShadow: '0 0 16px rgba(140,60,255,0.2)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(140,60,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(160,80,255,0.7)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(140,60,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(160,80,255,0.4)' }}
                >Next →</button>
              ) : (
                <button
                  onClick={handleClose}
                  style={{
                    background: 'linear-gradient(135deg, rgba(100,40,200,0.6), rgba(60,20,160,0.6))',
                    border: '1px solid rgba(160,80,255,0.5)',
                    borderRadius: 8, padding: '7px 18px',
                    color: 'rgba(220,180,255,0.95)',
                    fontSize: '11px', cursor: 'pointer',
                    fontFamily: 'monospace', letterSpacing: '0.1em',
                    boxShadow: '0 0 20px rgba(140,60,255,0.3)',
                    transition: 'all 0.2s',
                  }}
                >Got it ✓</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes qora-btn-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(140,60,255,0.25), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06); }
          50%       { box-shadow: 0 0 50px rgba(140,60,255,0.45), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06); }
        }
        @keyframes qora-live {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1.0; transform: scale(1.3); }
        }
        @keyframes qora-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
