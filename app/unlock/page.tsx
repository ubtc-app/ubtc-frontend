'use client'
import { useState, useEffect } from 'react'
import { InstitutionalUnlock } from '../components/InstitutionalUnlock'
import { ConsumerUnlock } from '../components/ConsumerUnlock'

export default function UnlockPage() {
  const [theme, setTheme] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // qufi_theme determines visual style; fall back to user_type for legacy sessions
    const t = localStorage.getItem('qufi_theme')
    if (t) {
      setTheme(t)
    } else {
      const ut = localStorage.getItem('qufi_user_type')
      setTheme(ut === 'institutional' ? 'light' : 'futuristic')
    }
    setReady(true)
  }, [])

  if (!ready) return null
  if (theme === 'light') return <InstitutionalUnlock />
  return <ConsumerUnlock />
}
