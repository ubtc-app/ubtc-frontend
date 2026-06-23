'use client'
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface TelegramSafeDisplayProps {
  title: string
  content: string
  description?: string
  confirmed: boolean
  onConfirmedChange: (value: boolean) => void
  confirmLabel?: string
  accentColor?: string
}

export function TelegramSafeDisplay({
  title,
  content,
  description,
  confirmed,
  onConfirmedChange,
  confirmLabel = 'I have saved this. I understand it cannot be recovered if lost.',
  accentColor = 'var(--t-orange)',
}: TelegramSafeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const mono: any = { fontFamily: 'var(--font-mono)' }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // Some Telegram WebViews block clipboard API — fall back to selecting text
      const input = document.createElement('textarea')
      input.value = content
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
      document.body.removeChild(input)
    }
  }

  return (
    <div style={{ background: 'var(--t-surface)', border: `1px solid ${accentColor}33`, borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
      <p style={{ color: accentColor, fontSize: '11px', fontWeight: 700, ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 4px' }}>{title}</p>
      {description && (
        <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: '0 0 14px', lineHeight: 1.6 }}>{description}</p>
      )}

      <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', borderRadius: '10px', padding: '14px', marginBottom: '12px', wordBreak: 'break-all' as const, color: 'var(--t-text)', fontSize: '13px', lineHeight: 1.6, ...mono }}>
        {content}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={handleCopy} style={{ flex: 1, background: copied ? 'var(--t-green)' : accentColor, color: copied ? 'white' : '#000', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '12px', fontWeight: 700, ...mono, cursor: 'pointer' }}>
          {copied ? 'Copied' : 'Copy to clipboard'}
        </button>
        <button onClick={() => setShowQR(!showQR)} style={{ flex: 1, background: 'var(--t-surface2)', color: 'var(--t-muted)', border: '1px solid var(--t-border)', borderRadius: '8px', padding: '12px', fontSize: '12px', fontWeight: 600, ...mono, cursor: 'pointer' }}>
          {showQR ? 'Hide QR' : 'Show QR code'}
        </button>
      </div>

      {showQR && (
        <div style={{ background: 'white', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <QRCodeSVG value={content} size={220} level="M" />
        </div>
      )}

      <div
        onClick={() => onConfirmedChange(!confirmed)}
        style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--t-surface)', border: `1px solid ${confirmed ? 'hsl(142 76% 36% / 0.4)' : 'var(--t-border)'}`, borderRadius: '10px', padding: '14px', cursor: 'pointer' }}
      >
        <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${confirmed ? 'var(--t-green)' : 'var(--t-border)'}`, background: confirmed ? 'var(--t-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {confirmed && <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✓</span>}
        </div>
        <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: 1.6 }}>{confirmLabel}</p>
      </div>
    </div>
  )
}