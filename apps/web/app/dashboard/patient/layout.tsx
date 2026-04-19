'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && user.role !== 'patient') {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading || !user || user.role !== 'patient') return null

  return <>{children}</>
}
