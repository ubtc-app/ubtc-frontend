'use client'
import { useState, useEffect } from 'react'
import { InstitutionalHome } from '../components/InstitutionalHome'
import { ConsumerHome } from '../components/ConsumerHome'

export default function Home() {
  const [userType, setUserType] = useState<string | null>(null)
  const [ready,    setReady]    = useState(false)

  useEffect(() => {
    setUserType(localStorage.getItem('qufi_user_type'))
    setReady(true)
  }, [])

  if (!ready) return null
  if (userType === 'institutional') return <InstitutionalHome />
  return <ConsumerHome />
}
