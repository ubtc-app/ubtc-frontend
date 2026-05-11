'use client'

import { useState } from 'react'

interface PasswordModalProps {
  isOpen: boolean
  onCancel: () => void
  onSubmit: (password: string) => void | Promise<void>
  title?: string
  subtitle?: string
}

export function PasswordModal({ isOpen, onCancel, onSubmit, title, subtitle }: PasswordModalProps) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!password || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(password)
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  const mono: any = { fontFamily: 'var(--font-mono)' }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'hsl(220 15% 3% / 0.85)',
        backdropFilter: 'blur(8px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'hsl(220 15% 6%)', border: '1px solid hsl(220 10% 14%)',
          borderRadius: '20px', padding: '28px', maxWidth: '440px', width: '100%',
          fontFamily: 'var(--font-display)',
        }}
      >
        <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' }}>
          {title || 'Enter Password'}
        </h2>
        {subtitle && (
          <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: '0 0 18px', lineHeight: '1.6' }}>
            {subtitle}
          </p>
        )}

        <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>
          Wallet Password
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Your wallet password"
            autoFocus
            style={{
              flex: 1, padding: '14px 16px', background: 'hsl(220 15% 4%)',
              border: '1px solid hsl(220 10% 16%)', borderRadius: '12px',
              color: 'hsl(0 0% 92%)', fontSize: '14px', ...mono, outline: 'none',
              boxSizing: 'border-box' as const,
            }}
          />
          <button
            onClick={() => setShow(!show)}
            style={{
              padding: '0 14px', background: 'hsl(220 15% 8%)',
              border: '1px solid hsl(220 10% 16%)', borderRadius: '12px',
              color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, cursor: 'pointer',
            }}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              flex: 1, padding: '14px', background: 'hsl(220 15% 8%)',
              border: '1px solid hsl(220 10% 14%)', borderRadius: '12px',
              color: 'hsl(0 0% 65%)', fontSize: '14px', fontWeight: '600',
              fontFamily: 'var(--font-display)', cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!password || submitting}
            style={{
              flex: 1, padding: '14px',
              background: password && !submitting ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)',
              border: 'none', borderRadius: '12px',
              color: password && !submitting ? 'white' : 'hsl(0 0% 28%)',
              fontSize: '14px', fontWeight: '700',
              fontFamily: 'var(--font-display)', cursor: password && !submitting ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  )
}
