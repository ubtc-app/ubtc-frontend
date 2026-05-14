'use client'

export type TelegramAuthResult =
  | { linked: true; wallet_address: string; username: string; telegram_id: number; telegram_handle?: string; telegram_first_name?: string }
  | { linked: false; telegram_id: number; telegram_handle?: string; telegram_first_name?: string }

export function isInTelegram(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Telegram?.WebApp?.initData
}

export function getInitData(): string | null {
  if (typeof window === 'undefined') return null
  return (window as any).Telegram?.WebApp?.initData || null
}

export function expandTelegramApp(): void {
  if (typeof window === 'undefined') return
  const tg = (window as any).Telegram?.WebApp
  if (tg?.expand) tg.expand()
  if (tg?.ready) tg.ready()
}

export async function authWithTelegram(apiUrl: string): Promise<TelegramAuthResult> {
  const initData = getInitData()
  if (!initData) throw new Error('Not in Telegram')
  const res = await fetch(`${apiUrl}/telegram/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ init_data: initData }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Telegram auth failed (${res.status}): ${err}`)
  }
  return res.json()
}