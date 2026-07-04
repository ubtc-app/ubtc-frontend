'use client'
import { useState, useEffect } from 'react'
import { InstitutionalHome } from '../components/InstitutionalHome'
import { ConsumerHome } from '../components/ConsumerHome'

export default function Home() {
  const [theme, setTheme] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
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
  if (theme === 'light') return <InstitutionalHome />
  return <ConsumerHome />
}
