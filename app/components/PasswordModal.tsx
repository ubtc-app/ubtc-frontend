'use client'

import { useState, useEffect } from 'react'

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

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
  const [inst, setInst] = useState(false)

  useEffect(() => { setInst(isInstitutional()) }, [])

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
        position: 'fixed', inset: 0,
        background: inst ? 'rgba(15,23,42,0.4)' : 'rgba(0,2,10,0.85)',
        backdropFilter: 'blur(8px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: inst ? '#fff' : 'linear-gradient(135deg,#050f20,#020810)',
          border: inst ? '1px solid #e2e8f0' : '1px solid rgba(0,212,255,0.15)',
          borderRadius: '20px', padding: '28px', maxWidth: '440px', width: '100%',
          fontFamily: 'var(--font-display)',
          boxShadow: inst ? '0 8px 40px rgba(0,0,0,0.12)' : '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        <h2 style={{ color: inst ? '#0f172a' : 'rgba(230,240,255,0.95)', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' }}>
          {title || 'Enter Password'}
        </h2>
        {subtitle && (
          <p style={{ color: inst ? '#64748b' : 'rgba(140,170,220,0.7)', fontSize: '13px', ...mono, margin: '0 0 18px', lineHeight: '1.6' }}>
            {subtitle}
          </p>
        )}

        <label style={{ display: 'block', color: inst ? '#64748b' : 'rgba(120,160,220,0.5)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>
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
              flex: 1, padding: '14px 16px',
              background: inst ? '#f8fafc' : 'rgba(0,3,18,0.8)',
              border: inst ? '1px solid #e2e8f0' : '1px solid rgba(0,212,255,0.2)',
              borderRadius: '12px',
              color: inst ? '#0f172a' : 'rgba(220,235,255,0.9)',
              fontSize: '14px', ...mono, outline: 'none',
              boxSizing: 'border-box' as const,
            }}
          />
          <button
            onClick={() => setShow(!show)}
            style={{
              padding: '0 14px',
              background: inst ? '#f1f5f9' : 'rgba(255,255,255,0.04)',
              border: inst ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: inst ? '#475569' : 'rgba(150,180,230,0.6)',
              fontSize: '12px', ...mono, cursor: 'pointer',
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
              flex: 1, padding: '14px',
              background: inst ? '#f8fafc' : 'rgba(255,255,255,0.04)',
              border: inst ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: inst ? '#475569' : 'rgba(150,180,230,0.6)',
              fontSize: '14px', fontWeight: '600',
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
              background: password && !submitting
                ? (inst ? '#1d4ed8' : 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))')
                : (inst ? '#e2e8f0' : 'rgba(255,255,255,0.06)'),
              border: 'none', borderRadius: '12px',
              color: password && !submitting ? '#fff' : (inst ? '#94a3b8' : 'rgba(120,150,200,0.4)'),
              fontSize: '14px', fontWeight: '700',
              fontFamily: 'var(--font-display)',
              cursor: password && !submitting ? 'pointer' : 'not-allowed',
              boxShadow: password && !submitting && inst ? '0 4px 16px rgba(29,78,216,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  )
}
