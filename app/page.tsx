'use client'
import { useRouter } from 'next/navigation'
import { useTheme } from './lib/theme'
import { SiteLogo } from './components/SiteLogo'

export default function Splash() {
  const router = useRouter()
  const { theme, toggle } = useTheme()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--t-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'var(--font-display)',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: '40px', animation: 'fade-in 0.6s ease both' }}>
        <SiteLogo height={48} />
      </div>

      {/* Manifesto card */}
      <div className="card" style={{
        maxWidth: '560px', width: '100%',
        padding: '40px', marginBottom: '40px', textAlign: 'center',
        animation: 'fade-up 0.5s ease 0.1s both',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ color: 'var(--t-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)', lineHeight: '1.9', margin: 0 }}>
            If you are reading this, you are part of an early group entering a new financial system.
          </p>

          <div className="divider" />

          <p style={{ color: 'var(--t-faint)', fontSize: '13px', fontFamily: 'var(--font-mono)', lineHeight: '1.9', margin: 0 }}>
            This is not simply a stablecoin. This is a decentralized monetary layer built directly on Bitcoin.
          </p>

          <p style={{ color: 'var(--t-accent)', fontSize: '13px', fontFamily: 'var(--font-mono)', lineHeight: '1.9', margin: 0 }}>
            Trust is replaced by cryptography. Banks are replaced by protocol. Control is replaced by consensus.
          </p>

          <p style={{ color: 'var(--t-orange)', fontSize: '13px', fontFamily: 'var(--font-mono)', lineHeight: '1.9', margin: 0 }}>
            Each participant becomes their own local bank.
          </p>

          <div className="divider" />

          <p style={{ color: 'var(--t-text)', fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', margin: 0 }}>
            Welcome to the World Local Bank.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', animation: 'fade-up 0.5s ease 0.2s both' }}>
        <button
          onClick={() => router.push('/unlock')}
          style={{
            background: 'transparent',
            border: '1px solid var(--t-accent-border)',
            color: 'var(--t-accent)',
            borderRadius: '50px',
            padding: '16px 60px',
            fontSize: '13px', fontWeight: '700',
            cursor: 'pointer', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em', textTransform: 'uppercase',
            boxShadow: 'var(--t-glow)',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--t-accent-bg)'
            e.currentTarget.style.borderColor = 'var(--t-accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'var(--t-accent-border)'
          }}
        >
          Enter
        </button>

        {/* Theme toggle on splash */}
        <button
          onClick={toggle}
          style={{
            background: 'none', border: 'none',
            color: 'var(--t-faint)', fontSize: '11px',
            fontFamily: 'var(--font-mono)', cursor: 'pointer',
            letterSpacing: '0.1em', padding: '4px 12px',
          }}
        >
          {theme === 'dark' ? '☀ Light mode' : '◑ Dark mode'}
        </button>
      </div>

      <p style={{ color: 'var(--t-faint)', fontSize: '10px', fontFamily: 'var(--font-mono)', margin: '32px 0 0', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5 }}>
        Taproot · Dilithium3 · SPHINCS+ · BIP340
      </p>
    </div>
  )
}
