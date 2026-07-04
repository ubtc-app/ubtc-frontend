'use client'
import { useEffect } from 'react'

export function ThemeApplicator() {
  useEffect(() => {
    const apply = () => {
      const type = localStorage.getItem('qufi_user_type')
      if (type) {
        document.documentElement.dataset.userType = type
      } else {
        delete document.documentElement.dataset.userType
      }
    }
    apply()
    window.addEventListener('qufi-profile-changed', apply)
    return () => window.removeEventListener('qufi-profile-changed', apply)
  }, [])
  return null
}
