'use client'
import { useEffect } from 'react'

export function ThemeApplicator() {
  useEffect(() => {
    const apply = () => {
      const qufiTheme = localStorage.getItem('qufi_theme')
      const userType  = localStorage.getItem('qufi_user_type')

      // Institutional users get the clean light theme
      const isInstitutional = qufiTheme === 'light' || userType === 'institutional'

      document.documentElement.dataset.userType = userType ?? ''
      document.documentElement.dataset.theme    = isInstitutional ? 'light' : 'dark'
      document.body.dataset.inst                = isInstitutional ? 'true' : ''
      // Force body background immediately — CSS cascade alone is too slow
      document.body.style.background            = isInstitutional ? '#f5f7fa' : ''
      document.body.style.color                 = isInstitutional ? '#0f172a' : ''
    }
    apply()
    window.addEventListener('qufi-profile-changed', apply)
    window.addEventListener('storage', apply)
    return () => {
      window.removeEventListener('qufi-profile-changed', apply)
      window.removeEventListener('storage', apply)
    }
  }, [])
  return null
}
