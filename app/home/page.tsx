'use client'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Icons } from '../components/Icons'
import { SiteLogo } from '../components/SiteLogo'
import { hasStoredWallet } from '../lib/wallet/storage'

const tags = [
  { label: 'UBTC',            color: 'var(--q-electric)' },
  { label: 'UUSDT',           color: 'var(--q-green)' },
  { label: 'UUSDC',           color: 'var(--q-cyan)' },
  { label: 'Quantum-Secured', color: 'var(--q-violet)' },
  { label: 'Taproot Assets',  color: 'var(--q-electric)' },
]

const cards = [
  {
    id: 'accounts',
    href: '/dashboard',
    label: 'Accounts',
    desc: 'View UBTC, UUSDT and UUSDC',
    accent: 'var(--q-electric)',
    glow: 'rgba(0,212,255,0.18)',
    border: 'rgba(0,212,255,0.22)',
    bg: 'rgba(0,212,255,0.05)',
    icon: (c: string) => Icons.accounts(26, c),
  },
  {
    id: 'vault',
    href: '/vault',
    label: 'Open Account',
    desc: 'Current, Savings, Yield or Managed',
    accent: 'var(--q-violet)',
    glow: 'rgba(124,58,255,0.15)',
    border: 'rgba(124,58,255,0.18)',
    bg: 'rgba(124,58,255,0.05)',
    icon: (c: string) => Icons.vault(26, c),
  },
]

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const auth = sessionStorage.getItem('wlb_auth')
    if (auth) return
    hasStoredWallet().then(has => {
      if (has) {
        sessionStorage.setItem('wlb_auth', '1')
      } else {
        router.replace('/unlock')
      }
    })
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--q-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Dot grid */}
      <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />

      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-10%', left: '25%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '0%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(124,58,255,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '640px' }}>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}
        >
          <SiteLogo height={38} />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: '44px' }}
        >
          <p style={{
            color: 'var(--q-text-3)', fontSize: '9px',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.28em',
            textTransform: 'uppercase', marginBottom: '16px',
          }}>
            Quantum Financial Infrastructure
          </p>

          <h1 style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 'clamp(30px, 5vw, 46px)',
            fontWeight: '800',
            letterSpacing: '-0.04em',
            lineHeight: '1.05',
            margin: '0 0 16px',
            color: 'var(--q-text)',
          }}>
            Bitcoin-Native{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--q-electric), var(--q-violet))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Banking
            </span>
          </h1>

          <p style={{
            color: 'var(--q-text-3)', fontSize: '13px', fontWeight: '300',
            fontFamily: 'var(--font-display)', lineHeight: '1.8',
            maxWidth: '360px', margin: '0 auto 24px',
          }}>
            Hold, send and receive Bitcoin-backed stablecoins.
            Self-custody. No banks required.
          </p>

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {tags.map(tag => (
              <span key={tag.label} className="pill" style={{
                color: tag.color,
                borderColor: tag.color + '30',
                background: tag.color + '0d',
              }}>
                {tag.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Action cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '36px' }}
        >
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => router.push(card.href)}
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                borderRadius: '22px',
                padding: '28px 22px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px',
                cursor: 'pointer', textAlign: 'left',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.07), 0 20px 50px rgba(0,0,0,0.6), 0 0 40px ${card.glow}`
                e.currentTarget.style.borderColor = card.accent.replace('var(', '').replace(')', '') + '55'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)'
                e.currentTarget.style.borderColor = card.border
              }}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '15px',
                background: card.accent + '18',
                border: `1px solid ${card.accent}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 20px ${card.glow}`,
              }}>
                {card.icon(card.accent)}
              </div>
              <div>
                <p style={{
                  fontFamily: 'var(--font-syne)',
                  color: 'var(--q-text)', fontWeight: '700',
                  fontSize: '17px', margin: '0 0 6px', letterSpacing: '-0.02em',
                }}>
                  {card.label}
                </p>
                <p style={{
                  color: 'var(--q-text-3)', fontSize: '11px',
                  fontFamily: 'var(--font-mono)', margin: 0, lineHeight: '1.6',
                }}>
                  {card.desc}
                </p>
              </div>
              <span style={{ color: card.accent, fontSize: '18px', marginTop: 'auto', alignSelf: 'flex-end', opacity: 0.65 }}>→</span>
            </button>
          ))}
        </motion.div>

        {/* Sign out */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} style={{ textAlign: 'center' }}>
          <button
            onClick={() => { sessionStorage.removeItem('wlb_auth'); router.push('/') }}
            style={{
              background: 'none', border: 'none',
              color: 'var(--q-text-3)', fontSize: '9px',
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
              letterSpacing: '0.2em', textTransform: 'uppercase', padding: '8px 16px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--q-red)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--q-text-3)')}
          >
            Sign out
          </button>
        </motion.div>
      </div>
    </div>
  )
}
