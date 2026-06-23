import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from './lib/theme'
import Header from './components/Header'
import { QuantumSigningOverlay } from './components/QuantumSigningOverlay'

export const metadata: Metadata = {
  title: 'uBTC — Quantum-Secured Bitcoin Layer',
  description: 'Post-quantum cryptographic vault and transfer protocol built on Bitcoin.',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <QuantumSigningOverlay />
          <Header />
          <div style={{ paddingTop: '64px' }}>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
