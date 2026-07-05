'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
interface ThemeCtx { theme: Theme; toggle: () => void }

const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const qufi = localStorage.getItem('qufi_theme')
    const userType = localStorage.getItem('qufi_user_type')
    const isInstitutional = qufi === 'light' || userType === 'institutional'
    if (isInstitutional) {
      setTheme('light')
    } else {
      const saved = localStorage.getItem('ubtc_theme') as Theme | null
      if (saved === 'light' || saved === 'dark') setTheme(saved)
    }
    setMounted(true)

    const recheck = () => {
      const q = localStorage.getItem('qufi_theme')
      const u = localStorage.getItem('qufi_user_type')
      setTheme(q === 'light' || u === 'institutional' ? 'light' : 'dark')
    }
    window.addEventListener('qufi-profile-changed', recheck)
    return () => window.removeEventListener('qufi-profile-changed', recheck)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ubtc_theme', theme)
  }, [theme, mounted])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

export const t = {
  bg:            'var(--t-bg)',
  surface:       'var(--t-surface)',
  surface2:      'var(--t-surface2)',
  surface3:      'var(--t-surface3)',
  border:        'var(--t-border)',
  borderSubtle:  'var(--t-border-subtle)',
  text:          'var(--t-text)',
  muted:         'var(--t-muted)',
  faint:         'var(--t-faint)',
  accent:        'var(--t-accent)',
  accentDeep:    'var(--t-accent-deep)',
  accentBg:      'var(--t-accent-bg)',
  accentBorder:  'var(--t-accent-border)',
  green:         'var(--t-green)',
  greenBg:       'var(--t-green-bg)',
  orange:        'var(--t-orange)',
  orangeBg:      'var(--t-orange-bg)',
  red:           'var(--t-red)',
  redBg:         'var(--t-red-bg)',
  purple:        'var(--t-purple)',
  purpleBg:      'var(--t-purple-bg)',
  shadowSm:      'var(--t-shadow-sm)',
  shadowMd:      'var(--t-shadow-md)',
  shadowLg:      'var(--t-shadow-lg)',
  shadowXl:      'var(--t-shadow-xl)',
  glow:          'var(--t-glow)',
} as const
