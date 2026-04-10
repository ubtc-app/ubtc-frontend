'use client'
import { useRouter } from 'next/navigation'

export default function Splash() {
  const router = useRouter()
  const mono: any = { fontFamily: 'var(--font-mono)' }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>

      {/* Logo */}
      <div style={{ marginBottom: '36px' }}>
        <img src="/worldlocalbanklogo.png" alt="World Local Bank" style={{ height: '46px', objectFit: 'contain' }} />
      </div>

      {/* Manifesto box */}
      <div style={{ maxWidth: '560px', width: '100%', background: 'hsl(220 15% 5% / 0.85)', border: '1px solid hsl(220 10% 13%)', borderRadius: '22px', padding: '36px 38px', marginBottom: '48px', textAlign: 'center' as const }}>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
          <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.9' }}>
            If you are reading this, you are part of an early group entering a new financial system.
          </p>

          <div style={{ height: '1px', background: 'hsl(220 10% 11%)' }} />

          <p style={{ color: 'hsl(0 0% 50%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.9' }}>
            This is not simply a stablecoin. This is a decentralized monetary layer built directly on Bitcoin.
          </p>

          <p style={{ color: 'hsl(205 85% 58%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.9' }}>
            Trust is replaced by cryptography. Banks are replaced by protocol. Control is replaced by consensus.
          </p>

          <p style={{ color: 'hsl(38 92% 55%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.9' }}>
            Each participant becomes their own local bank.
          </p>

          <div style={{ height: '1px', background: 'hsl(220 10% 11%)' }} />

          <p style={{ color: 'hsl(0 0% 88%)', fontSize: '15px', fontWeight: '700', ...mono, margin: 0, letterSpacing: '0.04em' }}>
            Welcome to the World Local Bank.
          </p>
        </div>
      </div>

      {/* Glowing Enter button */}
      <button
        onClick={() => router.push('/unlock')}
        style={{ background: 'transparent', border: '1px solid hsl(205 85% 55% / 0.6)', color: 'hsl(205 85% 65%)', borderRadius: '50px', padding: '16px 56px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', boxShadow: '0 0 30px hsl(205 85% 55% / 0.2), inset 0 0 30px hsl(205 85% 55% / 0.04)', transition: 'all 0.3s', position: 'relative' as const }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 0 60px hsl(205 85% 55% / 0.5), inset 0 0 40px hsl(205 85% 55% / 0.08)'
          e.currentTarget.style.borderColor = 'hsl(205 85% 65%)'
          e.currentTarget.style.color = 'hsl(205 85% 80%)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 0 30px hsl(205 85% 55% / 0.2), inset 0 0 30px hsl(205 85% 55% / 0.04)'
          e.currentTarget.style.borderColor = 'hsl(205 85% 55% / 0.6)'
          e.currentTarget.style.color = 'hsl(205 85% 65%)'
        }}
      >
        Enter
      </button>

      <p style={{ color: 'hsl(0 0% 15%)', fontSize: '10px', fontFamily: 'var(--font-mono)', margin: '28px 0 0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Taproot · Dilithium3 · Bitcoin
      </p>
    </div>
  )
}