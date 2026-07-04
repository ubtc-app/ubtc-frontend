'use client'
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQuantumNav } from './QuantumTransition'
import { Icons } from './Icons'
import { SiteLogo } from './SiteLogo'
import { hasStoredWallet } from '../lib/wallet/storage'

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

const tags = [
  { label: 'UBTC',            color: 'var(--q-electric)' },
  { label: 'UUSDT',           color: 'var(--q-green)' },
  { label: 'UUSDC',           color: 'var(--q-cyan)' },
  { label: 'Quantum-Secured', color: 'var(--q-violet)' },
  { label: 'Taproot Assets',  color: 'var(--q-electric)' },
]

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${3 + Math.random() * 94}%`,
  size: 1.5 + Math.random() * 2.5,
  dur: `${9 + Math.random() * 12}s`,
  delay: `${Math.random() * 15}s`,
  drift: `${(Math.random() - 0.5) * 60}px`,
  color: i % 3 === 0 ? '#00D4FF' : i % 3 === 1 ? '#7C3AFF' : '#00FFE0',
  glow:  i % 3 === 0 ? 'rgba(0,212,255,0.8)' : i % 3 === 1 ? 'rgba(124,58,255,0.8)' : 'rgba(0,255,224,0.8)',
}))

function HoloCard({ href, label, desc, accent, glow, border, bg, icon, inst }: {
  href: string; label: string; desc: string
  accent: string; glow: string; border: string; bg: string
  icon: (c: string) => ReactNode; inst: boolean
}) {
  const { navigate } = useQuantumNav()
  const ref    = useRef<HTMLButtonElement>(null)
  const rafRef = useRef<number | null>(null)

  const onMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (inst) return
    const el = ref.current; if (!el) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 28
      const y = ((e.clientY - r.top)  / r.height - 0.5) * -28
      el.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateZ(16px)`
    })
  }, [inst])

  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return
    el.style.transition = 'transform 0.7s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s'
    el.style.transform  = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
    setTimeout(() => { if (el) el.style.transition = 'transform 0.08s ease, box-shadow 0.25s' }, 700)
  }, [])

  return (
    <button
      ref={ref}
      onClick={e => { const r = e.currentTarget.getBoundingClientRect(); navigate(href, r.left + r.width/2, r.top + r.height/2) }}
      onMouseMove={onMove}
      onMouseLeave={e => {
        onLeave()
        if (!inst) e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 40px rgba(0,0,0,0.4)`
      }}
      className={inst ? 'inst-btn' : 'q-holo'}
      style={{
        background: inst ? '#fff' : `color-mix(in srgb, var(--q-surface) 70%, transparent), ${bg}`,
        border: inst ? '1px solid #e2e8f0' : `1px solid ${border}`,
        borderRadius: 24,
        padding: '28px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14,
        cursor: 'pointer', textAlign: 'left',
        backdropFilter: inst ? 'none' : 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: inst ? 'none' : 'blur(40px) saturate(200%)',
        boxShadow: inst ? '0 2px 12px rgba(0,0,0,0.07)' : `inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 40px var(--q-shadow, rgba(0,0,0,0.4))`,
        transition: 'transform 0.08s ease, box-shadow 0.25s',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (inst) return
        e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.7), 0 0 60px ${glow}`
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: inst ? accent + '18' : `linear-gradient(135deg, ${accent}20, ${accent}08)`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: inst ? 'none' : `0 0 24px ${glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
        position: 'relative',
      }}>
        {icon(accent)}
      </div>

      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: 'var(--font-syne)',
          color: inst ? '#0f172a' : 'var(--q-text)', fontWeight: 700,
          fontSize: 18, margin: '0 0 5px', letterSpacing: '0.01em',
          textTransform: 'uppercase',
        }}>{label}</p>
        <p style={{
          color: inst ? '#64748b' : 'var(--q-text-3)', fontSize: '11px',
          fontFamily: 'var(--font-mono)', margin: 0, lineHeight: 1.7,
          letterSpacing: '0.04em',
        }}>{desc}</p>
      </div>

      <span style={{
        color: accent, fontSize: 18, alignSelf: 'flex-end',
        textShadow: inst ? 'none' : `0 0 12px ${glow}`,
        fontFamily: 'var(--font-mono)',
      }}>→</span>

      {!inst && (
        <div style={{
          position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`,
          borderRadius: '0 0 24px 24px',
        }} />
      )}
    </button>
  )
}

export function ConsumerHome() {
  const router = useRouter()
  const [inst, setInst] = useState(false)
  const [accountHref,  setAccountHref]  = useState('/vault')
  const [accountLabel, setAccountLabel] = useState('Open Account')
  const [accountDesc,  setAccountDesc]  = useState('Current, Savings, Yield or Managed')

  useEffect(() => { setInst(isInstitutional()) }, [])

  useEffect(() => {
    const auth = sessionStorage.getItem('wlb_auth')
    if (auth) return
    hasStoredWallet().then(has => {
      if (has) sessionStorage.setItem('wlb_auth', '1')
      else router.replace('/unlock')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const vaultId = localStorage.getItem('ubtc_active_vault_id')
    if (vaultId) {
      setAccountHref(`/account/${vaultId}`)
      setAccountLabel('My Account')
      setAccountDesc('View balances, deposit & mint UBTC')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: inst ? '#f5f7fa' : 'var(--q-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-display)',
    }}>
      {!inst && (
        <div className="q-vortex-scene">
          <div className="q-glow-node" style={{ top: '-5%',  left: '30%', width: 800, height: 800, background: 'rgba(0,212,255,0.04)' }} />
          <div className="q-glow-node" style={{ bottom: '-5%', right: '15%', width: 700, height: 700, background: 'rgba(124,58,255,0.05)' }} />
          <div className="q-glow-node" style={{ top: '40%', left: '-5%',  width: 500, height: 500, background: 'rgba(0,255,224,0.03)' }} />
          <div className="q-circuit-grid" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />
          <div className="q-scanline" style={{ animationDuration: '12s' }} />
          <div className="q-ring-1" style={{ width: 1100, height: 1100, margin: '-550px 0 0 -550px', opacity: 0.5 }} />
          <div className="q-ring-2" style={{ width: 750, height: 750, margin: '-375px 0 0 -375px', opacity: 0.6 }} />
          <div className="q-ring-3" style={{ opacity: 0.7 }} />
          <div className="q-vortex-core" style={{ opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%' }}>
            <div className="q-energy-ring" style={{ animationDuration: '7s' }} />
            <div className="q-energy-ring" style={{ animationDuration: '7s', animationDelay: '2.3s' }} />
          </div>
          {PARTICLES.map(p => (
            <div key={p.id} className="q-particle" style={{
              left: p.left, bottom: '-10px',
              width: p.size, height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.glow}`,
              '--dur': p.dur, '--delay': p.delay, '--drift': p.drift,
            } as any} />
          ))}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 660 }}>

        <div className="warp-in" style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
          <SiteLogo height={36} />
        </div>

        <div className="warp-in-d1" style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{
            color: inst ? '#64748b' : 'rgba(0,212,255,0.4)', fontSize: '9px',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.32em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>Quantum Financial Infrastructure</p>

          <h1 style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800,
            letterSpacing: '0.03em', lineHeight: 1.05,
            margin: '0 0 18px', textTransform: 'uppercase',
          }}>
            {inst ? (
              <span style={{ color: '#0f172a' }}>Bitcoin-Native <span style={{ color: '#1d4ed8' }}>Banking</span></span>
            ) : (
              <>
                <span style={{ background: 'linear-gradient(135deg, #f0f6ff 0%, rgba(180,210,255,0.85) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Bitcoin-Native </span>
                <span className="q-chromatic" style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Banking</span>
              </>
            )}
          </h1>

          <p style={{
            color: inst ? '#64748b' : 'rgba(120,160,220,0.5)', fontSize: '13px', fontWeight: 300,
            fontFamily: 'var(--font-display)', lineHeight: 1.9,
            maxWidth: 360, margin: '0 auto 24px', letterSpacing: '0.03em',
          }}>
            Hold, send and receive Bitcoin-backed stablecoins.<br />
            Self-custody. Quantum-secured. No banks required.
          </p>

          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap' }}>
            {tags.map((tag, i) => (
              <span key={tag.label} className="pill warp-in" style={{
                color: tag.color,
                borderColor: tag.color + '30',
                background: inst ? tag.color + '12' : tag.color + '0d',
                boxShadow: inst ? 'none' : `0 0 12px ${tag.color}15`,
                animationDelay: `${0.3 + i * 0.06}s`,
              }}>{tag.label}</span>
            ))}
          </div>
        </div>

        <div className="warp-in-d2" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14, marginBottom: 36,
        }}>
          <HoloCard
            href="/dashboard"
            label="Accounts"
            desc="View UBTC, UUSDT and UUSDC"
            accent="var(--q-electric)" glow="rgba(0,212,255,0.2)"
            border="rgba(0,212,255,0.18)" bg="rgba(0,212,255,0.04)"
            icon={c => Icons.accounts(24, c)}
            inst={inst}
          />
          <HoloCard
            href={accountHref}
            label={accountLabel}
            desc={accountDesc}
            accent="var(--q-violet)" glow="rgba(124,58,255,0.2)"
            border="rgba(124,58,255,0.15)" bg="rgba(124,58,255,0.04)"
            icon={c => Icons.vault(24, c)}
            inst={inst}
          />
        </div>

        <div className="warp-in-d3" style={{ textAlign: 'center' }}>
          <button
            onClick={() => { sessionStorage.removeItem('wlb_auth'); router.push('/') }}
            style={{
              background: 'none', border: 'none',
              color: inst ? '#94a3b8' : 'rgba(120,160,220,0.3)', fontSize: '9px',
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
              letterSpacing: '0.22em', textTransform: 'uppercase', padding: '8px 16px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = inst ? '#ef4444' : 'var(--q-red)')}
            onMouseLeave={e => (e.currentTarget.style.color = inst ? '#94a3b8' : 'rgba(120,160,220,0.3)')}
          >Disconnect</button>
        </div>
      </div>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .inst-btn:hover { transform: translateY(-3px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        .inst-btn:active { transform: scale(0.97) !important; transition: transform 0.08s ease !important; }
      `}</style>
    </div>
  )
}
