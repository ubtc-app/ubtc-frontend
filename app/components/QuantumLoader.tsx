'use client'

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

export function QuantumLoader({ text = 'Loading' }: { text?: string }) {
  const inst = isInstitutional()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: inst ? '#f5f7fa' : 'var(--q-bg)',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        background: inst ? '#fff' : 'linear-gradient(135deg,#050f20,#020810)',
        border: inst ? '1px solid #e2e8f0' : '1px solid rgba(0,212,255,0.18)',
        borderRadius: 24, padding: '40px 52px',
        boxShadow: inst ? '0 4px 24px rgba(0,0,0,0.08)' : '0 0 60px rgba(0,212,255,0.1), 0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(0,212,255,0.12)',
      }}>
        {/* Triple quantum rings */}
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(0,212,255,0.12)', borderTopColor: '#00D4FF', animation: 'ql-spin 1s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1.5px solid rgba(124,58,255,0.12)', borderTopColor: '#7C3AFF', animation: 'ql-spin .7s linear infinite reverse' }} />
          <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: '1.5px solid rgba(0,255,224,0.12)', borderTopColor: '#00FFE0', animation: 'ql-spin 1.3s linear infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: '#00D4FF', boxShadow: '0 0 14px #00D4FF, 0 0 28px rgba(0,212,255,0.5)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ color: inst ? '#374151' : 'rgba(0,212,255,0.7)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{text}</p>
          <span style={{ display: 'flex', gap: 3 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: inst ? '#6b7280' : '#00D4FF', opacity: 0.6, animation: `ql-dot 1.2s ease infinite`, animationDelay: `${i * 0.2}s` }} />
            ))}
          </span>
        </div>
        <style>{`
          @keyframes ql-spin { to { transform: rotate(360deg) } }
          @keyframes ql-dot  { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }
        `}</style>
      </div>
    </div>
  )
}

export function QuantumLoaderInline({ text = 'Loading' }: { text?: string }) {
  const inst = isInstitutional()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(0,212,255,0.12)', borderTopColor: '#00D4FF', animation: 'ql-spin 1s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: '1.5px solid rgba(124,58,255,0.12)', borderTopColor: '#7C3AFF', animation: 'ql-spin .7s linear infinite reverse' }} />
      </div>
      <span style={{ color: inst ? '#374151' : 'rgba(0,212,255,0.6)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{text}</span>
      <style>{`@keyframes ql-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
