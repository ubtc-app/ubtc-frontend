'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { isInTelegram, getInitData, expandTelegramApp, authWithTelegram, type TelegramAuthResult } from '../lib/telegram'

export default function TelegramLandingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'linking' | 'onboarding' | 'error' | 'browser'>('checking')
  const [errorMsg, setErrorMsg] = useState('')
  const [tgInfo, setTgInfo] = useState<{ id?: number; handle?: string; name?: string }>({})

  useEffect(() => {
    expandTelegramApp()

    if (!isInTelegram()) {
      setStatus('browser')
      return
    }

    ;(async () => {
      try {
        const result: TelegramAuthResult = await authWithTelegram(API_URL)
        setTgInfo({ id: result.telegram_id, handle: result.telegram_handle, name: result.telegram_first_name })

        if (result.linked) {
          // Existing user. Mark session, jump to dashboard.
          sessionStorage.setItem('wlb_auth', 'telegram')
          localStorage.setItem('ubtc_wallet_address', result.wallet_address)
          if (result.username) localStorage.setItem('ubtc_username', result.username)
          setStatus('linking')
          setTimeout(() => router.replace('/dashboard'), 300)
        } else {
          // New user. Send to signup with Telegram identity prefilled.
          const qp = new URLSearchParams({
            tg_id: String(result.telegram_id),
            tg_handle: result.telegram_handle || '',
            tg_name: result.telegram_first_name || '',
          })
          setStatus('onboarding')
          setTimeout(() => router.replace(`/vault?${qp.toString()}`), 300)
        }
      } catch (e: any) {
        setStatus('error')
        setErrorMsg(e?.message || 'Authentication failed')
      }
    })()
  }, [router])

  const mono: any = { fontFamily: 'var(--font-mono)' }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <img src="/wlb.png" alt="UBTC" style={{ height: '64px', marginBottom: '24px' }} />

        {status === 'checking' && (
          <>
            <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Authenticating</h1>
            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0 }}>Verifying your Telegram identity...</p>
          </>
        )}

        {status === 'linking' && (
          <>
            <h1 style={{ color: 'hsl(142 76% 36%)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Welcome back{tgInfo.name ? `, ${tgInfo.name}` : ''}</h1>
            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0 }}>Opening your wallet...</p>
          </>
        )}

        {status === 'onboarding' && (
          <>
            <h1 style={{ color: 'hsl(205 85% 55%)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Let's create your wallet</h1>
            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0 }}>Setting up your quantum-secured account{tgInfo.handle ? ` for @${tgInfo.handle}` : ''}...</p>
          </>
        )}

        {status === 'browser' && (
          <>
            <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>Open in Telegram</h1>
            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: '0 0 24px', lineHeight: 1.7 }}>This page is the Telegram Mini App entry. Open the bot in Telegram to launch your wallet, or continue in browser below.</p>
            <a href="/dashboard" style={{ display: 'inline-block', background: 'hsl(38 92% 50%)', color: '#000', textDecoration: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Continue in Browser</a>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={{ color: 'hsl(0 84% 60%)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Authentication Failed</h1>
            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '12px', ...mono, margin: '0 0 16px' }}>{errorMsg}</p>
            <a href="/dashboard" style={{ color: 'hsl(205 85% 55%)', textDecoration: 'none', fontSize: '13px', ...mono }}>Continue in Browser →</a>
          </>
        )}
      </div>
    </div>
  )
}