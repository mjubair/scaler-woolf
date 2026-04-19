'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context'

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && user.role !== 'doctor') {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading || !user || user.role !== 'doctor') return null

  return <>{children}</>
}
