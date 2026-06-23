'use client'

import { useState, useEffect } from 'react'

type Stage = '' | 'signing' | 'broadcasting'

interface SigningOverlayProps {
  /** The signingStage from your page state. */
  stage: Stage
  /** Token color used for active step + accents. */
  tokenColor?: string
  /** Display name shown in subtitle, e.g. "UBTC". */
  tokenName?: string
  /** Optional amount, shown in subtitle for context. */
  amount?: string
  /** Label above the title. */
  context?: string
}

const mono: any = { fontFamily: 'var(--font-mono)' }

export function SigningOverlay({
  stage,
  tokenColor = 'var(--t-orange)',
  tokenName = 'UBTC',
  amount,
  context = 'Authorizing redemption',
}: SigningOverlayProps) {
  const [quantumActive, setQuantumActive] = useState(false)

  // Auto-detect the PQ signing span from challenge.ts events. The page's
  // `stage` tells us the outer phase; these events tell us when actual
  // signing is happening inside signedSpend().
  useEffect(() => {
    const start = () => setQuantumActive(true)
    const end = () => setQuantumActive(false)
    window.addEventListener('quantum-signing-start', start)
    window.addEventListener('quantum-signing-end', end)
    return () => {
      window.removeEventListener('quantum-signing-start', start)
      window.removeEventListener('quantum-signing-end', end)
    }
  }, [])

  // Block accidental close/refresh while a flow is in flight.
  useEffect(() => {
    if (!stage) return
    const block = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', block)
    return () => window.removeEventListener('beforeunload', block)
  }, [stage])

  if (!stage) return null

  type Phase = 'decrypting' | 'signing' | 'broadcasting'
  const phase: Phase =
    stage === 'broadcasting'
      ? 'broadcasting'
      : quantumActive
        ? 'signing'
        : 'decrypting'

  const copy = {
    decrypting: {
      title: 'Decrypting wallet key',
      subtitle:
        'Unwrapping your post-quantum signing key from your 24-word recovery phrase. Never leaves this browser.',
    },
    signing: {
      title: 'Generating quantum signature',
      subtitle:
        'Signing with hybrid ML-DSA-65 + SLH-DSA-SHAKE-256s. This can take a few seconds.',
    },
    broadcasting: {
      title: 'Broadcasting on Bitcoin',
      subtitle: 'Submitting the signed redemption to the network.',
    },
  }[phase]

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--t-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'wlb-overlay-in .22s ease-out',
        fontFamily: 'var(--font-display)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, var(--t-surface2) 0%, var(--t-bg) 100%)',
          border: `1px solid ${tokenColor}22`,
          borderRadius: '20px',
          padding: '36px 32px 28px',
          maxWidth: '460px',
          width: 'calc(100% - 32px)',
          boxShadow: `0 30px 80px -20px var(--t-bg), 0 0 0 1px ${tokenColor}08`,
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            width: '52px',
            height: '52px',
            margin: '0 auto 26px',
            border: `3px solid ${tokenColor}1f`,
            borderTopColor: tokenColor,
            borderRadius: '50%',
            animation: 'wlb-spin .85s linear infinite',
          }}
        />

        <p
          style={{
            color: tokenColor,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
            ...mono,
          }}
        >
          {context}
        </p>

        <h2
          style={{
            color: 'var(--t-text)',
            fontSize: '22px',
            fontWeight: 700,
            margin: '0 0 10px',
            letterSpacing: '-0.01em',
          }}
        >
          {copy.title}
        </h2>

        <p
          style={{
            color: 'hsl(0 0% 48%)',
            fontSize: '13px',
            lineHeight: 1.55,
            margin: '0 0 26px',
            ...mono,
          }}
        >
          {copy.subtitle}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '4px',
            padding: '0 8px',
            marginBottom: '24px',
          }}
        >
          <Step
            label="Decrypt"
            state={phase === 'decrypting' ? 'active' : 'done'}
            tokenColor={tokenColor}
          />
          <Connector done={phase !== 'decrypting'} />
          <Step
            label="Sign"
            state={
              phase === 'decrypting'
                ? 'pending'
                : phase === 'signing'
                  ? 'active'
                  : 'done'
            }
            tokenColor={tokenColor}
          />
          <Connector done={phase === 'broadcasting'} />
          <Step
            label="Submit"
            state={phase === 'broadcasting' ? 'active' : 'pending'}
            tokenColor={tokenColor}
          />
        </div>

        {amount && (
          <p
            style={{
              color: 'var(--t-faint)',
              fontSize: '11px',
              ...mono,
              margin: '0 0 16px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--t-border-subtle)',
            }}
          >
            {parseFloat(amount).toLocaleString()} {tokenName}
          </p>
        )}

        <p
          style={{
            color: 'var(--t-faint)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
            ...mono,
            margin: 0,
          }}
        >
          Do not close this window or navigate away
        </p>
      </div>

      <style>{`
        @keyframes wlb-spin { to { transform: rotate(360deg); } }
        @keyframes wlb-overlay-in {
          from { opacity: 0; transform: scale(.98); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes wlb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .65; transform: scale(.92); }
        }
      `}</style>
    </div>
  )
}

function Step({
  label,
  state,
  tokenColor,
}: {
  label: string
  state: 'pending' | 'active' | 'done'
  tokenColor: string
}) {
  const successColor = 'var(--t-green)'
  const pendingColor = 'var(--t-border)'
  const color =
    state === 'done' ? successColor : state === 'active' ? tokenColor : pendingColor

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        flex: '0 0 auto',
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          border: `2px solid ${color}`,
          background: state === 'done' ? successColor : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          color: state === 'done' ? 'var(--t-bg)' : color,
          fontWeight: 700,
          transition: 'all 0.25s ease',
          animation: state === 'active' ? 'wlb-pulse 1.4s ease-in-out infinite' : 'none',
        }}
      >
        {state === 'done' ? 'âœ“' : state === 'active' ? 'â—' : ''}
      </div>
      <div
        style={{
          fontSize: '9px',
          color,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function Connector({ done }: { done: boolean }) {
  const successColor = 'var(--t-green)'
  return (
    <div
      style={{
        flex: 1,
        height: '2px',
        background: done ? successColor : 'var(--t-border)',
        marginTop: '14px',
        transition: 'background 0.3s ease',
      }}
    />
  )
}