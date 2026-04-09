'use client'

function FloatingParticles() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? '3px' : '2px',
          height: i % 3 === 0 ? '3px' : '2px',
          borderRadius: '50%',
          background: `hsl(205 85% ${55 + (i % 20)}% / ${0.3 + (i % 5) * 0.1})`,
          left: `${(i * 37 + 10) % 100}%`,
          top: `${(i * 53 + 20) % 100}%`,
          animation: `particle-float ${8 + (i % 6)}s ease-in-out infinite`,
          animationDelay: `${i * 0.7}s`,
        }} />
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', position: 'relative', overflow: 'hidden' }}>
      <FloatingParticles />

      <div style={{ position: 'absolute', top: '-200px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-200px', width: '500px', height: '500px', borderRadius: '50%', background: 'hsl(195 70% 45% / 0.03)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '80px 40px', textAlign: 'center' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Protocol Live</span>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
        </div>

        <h1 style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: '700', lineHeight: '0.95', marginBottom: '32px', fontFamily: 'var(--font-display)' }}>
          <span style={{ color: 'hsl(0 0% 92%)' }}>
            Stable Value.<br />
          </span>
          <span style={{ color: 'hsl(205 85% 55%)' }}>
            Secured by Bitcoin.
          </span>
        </h1>

        <p style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'hsl(0 0% 65%)', maxWidth: '480px', lineHeight: '1.8', marginBottom: '24px' }}>
          UBTC introduces a native stable currency for the Bitcoin economy.<br />
          Lock BTC. Mint UBTC. Redeem anytime. No banks. No custodians.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '48px', padding: '10px 20px', background: 'hsl(205 85% 55% / 0.08)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '40px' }}>
          <span style={{ fontSize: '14px' }}>⚛️</span>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'hsl(205 85% 55%)', letterSpacing: '0.1em' }}>
            Post-Quantum Secure — Military-Grade Transfer Protection
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '60px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/vault" style={{ backgroundImage: 'var(--gradient-mint)', color: 'white', textDecoration: 'none', padding: '16px 40px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }}>Launch App</a>
          <a href="http://localhost:8081" style={{ color: 'hsl(0 0% 65%)', textDecoration: 'none', padding: '16px 40px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', border: '1px solid hsl(220 10% 16%)', display: 'inline-block' }}>Learn More</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', maxWidth: '700px', width: '100%', marginBottom: '32px' }}>
          {[
            { val: '150%', label: 'Min collateral' },
            { val: '1:1', label: 'USD peg' },
            { val: '100%', label: 'BTC backed' },
            { val: 'Live', label: 'Oracle price' },
          ].map(s => (
            <div key={s.val} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '12px', padding: '20px 16px' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'hsl(205 85% 55%)', marginBottom: '4px' }}>{s.val}</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'hsl(0 0% 65%)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '700px', width: '100%', marginBottom: '60px' }}>
          {[
            { icon: '🔐', title: 'OTP Protected', desc: 'Every transfer requires multi-factor approval before execution' },
            { icon: '⚛️', title: 'Quantum Secure', desc: 'Post-quantum cryptographic signatures protect all transfers' },
            { icon: '🔑', title: 'Dual-Key Auth', desc: 'Protocol-level second key required to authorize any transfer' },
          ].map(f => (
            <div key={f.title} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '12px', padding: '20px 16px', textAlign: 'left' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'hsl(0 0% 92%)', fontFamily: 'var(--font-display)', marginBottom: '6px' }}>{f.title}</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'hsl(0 0% 55%)', lineHeight: '1.6' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '700px' }}>
          <div style={{ height: '1px', flex: 1, background: 'hsl(220 10% 16%)' }} />
          {['100% Bitcoin-Backed', 'Non-Custodial', 'Quantum-Secure', 'Overcollateralized'].map(t => (
            <span key={t} style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'hsl(0 0% 65%)', letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{t}</span>
          ))}
          <div style={{ height: '1px', flex: 1, background: 'hsl(220 10% 16%)' }} />
        </div>
      </div>
    </div>
  )
}