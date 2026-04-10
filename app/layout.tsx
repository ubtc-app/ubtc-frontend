import type { Metadata } from 'next'
import './globals.css'
import WalletButton from './components/WalletButton'

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
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'hsl(220 15% 5% / 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid hsl(220 10% 16%)',
          height: '68px',
          display: 'flex', alignItems: 'center',
          padding: '0 32px',
          justifyContent: 'space-between',
        }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="UBTC" style={{ height: '30px', width: 'auto' }} />
          </a>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <a href="/dashboard" className="nav-link">My Accounts</a>
            <a href="/wallet" className="nav-link">Wallet</a>
            <a href="/recovery" className="nav-link">Recovery</a>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <a href="http://localhost:8081" className="nav-link">← Home</a>
            <WalletButton />
            <a href="/vault" style={{
              backgroundImage: 'var(--gradient-mint)',
              color: 'white', textDecoration: 'none', borderRadius: '8px',
              padding: '8px 18px', fontSize: '12px', fontWeight: '600',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 0 20px hsl(205 85% 55% / 0.3)', whiteSpace: 'nowrap',
            }}>+ New Account</a>
          </div>
        </nav>
        <div style={{ paddingTop: '68px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}