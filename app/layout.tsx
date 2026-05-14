import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Header from './components/Header'
import { QuantumSigningOverlay } from './components/QuantumSigningOverlay'

export const metadata: Metadata = {
  title: 'UBTC — Stable Value. Secured by Bitcoin.',
  description: 'The Bitcoin-native stablecoin protocol',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
   <html lang="en">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <QuantumSigningOverlay />
        <Header />
        <div style={{ paddingTop: '60px' }}>
          {children}
        </div>
      </body>
    </html>
	)
}