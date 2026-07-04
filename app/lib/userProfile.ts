export type UserType = 'institutional' | 'consumer'

export interface UserProfile {
  name: string
  type: UserType
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  const name = localStorage.getItem('qufi_name')
  const type = localStorage.getItem('qufi_user_type') as UserType | null
  if (!name || !type) return null
  return { name, type }
}

export function setUserProfile(name: string, type: UserType) {
  localStorage.setItem('qufi_name', name)
  localStorage.setItem('qufi_user_type', type)
}

export function clearUserProfile() {
  localStorage.removeItem('qufi_name')
  localStorage.removeItem('qufi_user_type')
}
