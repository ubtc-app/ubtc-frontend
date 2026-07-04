'use client'
import { useState, useEffect } from 'react'
import { InstitutionalUnlock } from '../components/InstitutionalUnlock'
import { ConsumerUnlock } from '../components/ConsumerUnlock'

export default function UnlockPage() {
  const [userType, setUserType] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUserType(localStorage.getItem('qufi_user_type'))
    setReady(true)
  }, [])

  if (!ready) return null
  if (userType === 'institutional') return <InstitutionalUnlock />
  return <ConsumerUnlock />
}
