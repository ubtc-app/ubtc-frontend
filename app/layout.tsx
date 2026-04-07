import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UBTC — Stable Value. Secured by Bitcoin.',
  description: 'The Bitcoin-native stablecoin protocol',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          background: 'hsl(220 15% 5% / 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid hsl(220 10% 16%)',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          justifyContent: 'space-between',
        }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="UBTC" style={{ height: '32px', width: 'auto' }} />
          </a>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
            <a href="http://localhost:8081" style={{
              color: 'hsl(205 85% 55%)',
              textDecoration: 'none',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>← Home</a>
            {[
              { label: 'Dashboard', href: '/dashboard' },
{ label: 'Vault', href: '/vault' },
{ label: 'Deposit', href: '/deposit' },
{ label: 'Mint', href: '/mint' },
{ label: 'Redeem', href: '/redeem' },
{ label: 'Withdraw', href: '/withdraw' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                color: 'hsl(0 0% 65%)',
                textDecoration: 'none',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>{item.label}</a>
            ))}
          </div>
        </nav>
        <div style={{ paddingTop: '72px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}