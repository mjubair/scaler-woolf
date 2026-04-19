'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context'

export default function DashboardRedirect() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role === 'admin') {
      router.push('/dashboard/admin')
    } else if (user.role === 'doctor') {
      router.push('/dashboard/doctor')
    } else {
      router.push('/dashboard/patient')
    }
  }, [user, loading, router])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
