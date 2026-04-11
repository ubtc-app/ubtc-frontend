'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuthGuard() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('wlb_auth')
      if (!auth) {
        router.replace('/unlock')
      } else {
        setAuthed(true)
      }
    }
  }, [router])

  return authed
}
