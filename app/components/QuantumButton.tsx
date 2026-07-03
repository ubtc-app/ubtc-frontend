'use client'
import { useQuantumNav } from './QuantumTransition'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'

interface QuantumButtonProps {
  href?: string
  onClick?: (e: MouseEvent<HTMLElement>) => void
  children: ReactNode
  style?: CSSProperties
  className?: string
  variant?: 'primary' | 'ghost' | 'naked'
  disabled?: boolean
  type?: 'button' | 'submit'
}

const BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  position: 'relative',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  overflow: 'visible',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  transition: 'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease',
}

const VARIANTS: Record<string, CSSProperties> = {
  primary: {
    background: 'rgba(0,10,40,0.5)',
    border: '1px solid rgba(0,180,255,0.5)',
    borderRadius: '50px',
    padding: '14px 40px',
    fontSize: '11px',
    color: 'rgba(130,215,255,0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 0 30px rgba(0,120,255,0.12), inset 0 1px 0 rgba(120,210,255,0.1)',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid rgba(0,180,255,0.3)',
    borderRadius: '12px',
    padding: '10px 24px',
    fontSize: '11px',
    color: 'rgba(0,212,255,0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  naked: {
    background: 'transparent',
    border: 'none',
    padding: '0',
    color: 'var(--q-electric)',
    fontSize: 'inherit',
  },
}

export function QuantumButton({
  href,
  onClick,
  children,
  style,
  className,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: QuantumButtonProps) {
  const { navigate } = useQuantumNav()

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ox = rect.left + rect.width / 2
    const oy = rect.top  + rect.height / 2

    if (href) {
      e.preventDefault()
      navigate(href, ox, oy)
    } else if (onClick) {
      onClick(e)
      // Still fire the visual burst for non-nav actions
      const ev = new CustomEvent('qt-burst', { detail: { x: ox, y: oy } })
      window.dispatchEvent(ev)
    }
  }

  const merged: CSSProperties = { ...BASE, ...VARIANTS[variant], ...style }

  const hover = (e: MouseEvent<HTMLElement>, on: boolean) => {
    if (disabled || variant === 'naked') return
    const el = e.currentTarget as HTMLElement
    if (on) {
      el.style.transform   = 'scale(1.03) translateY(-1px)'
      el.style.borderColor = variant === 'primary' ? 'rgba(0,210,255,0.8)' : 'rgba(0,210,255,0.55)'
      el.style.boxShadow   = '0 0 60px rgba(0,160,255,0.25), 0 4px 24px rgba(80,0,255,0.12), inset 0 1px 0 rgba(120,210,255,0.15)'
    } else {
      el.style.transform   = ''
      el.style.borderColor = variant === 'primary' ? 'rgba(0,180,255,0.5)' : 'rgba(0,180,255,0.3)'
      el.style.boxShadow   = variant === 'primary' ? '0 0 30px rgba(0,120,255,0.12), inset 0 1px 0 rgba(120,210,255,0.1)' : ''
    }
  }

  const active = (e: MouseEvent<HTMLElement>, on: boolean) => {
    if (disabled || variant === 'naked') return
    const el = e.currentTarget as HTMLElement
    el.style.transform = on ? 'scale(0.97)' : ''
  }

  if (href) {
    return (
      <a
        href={href}
        onClick={handleClick}
        className={className}
        style={merged}
        onMouseEnter={e => hover(e, true)}
        onMouseLeave={e => hover(e, false)}
        onMouseDown={e => active(e, true)}
        onMouseUp={e => active(e, false)}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      className={className}
      style={{ ...merged, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      disabled={disabled}
      onMouseEnter={e => hover(e, true)}
      onMouseLeave={e => hover(e, false)}
      onMouseDown={e => active(e, true)}
      onMouseUp={e => active(e, false)}
    >
      {children}
    </button>
  )
}
