'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import { useAuth } from '@/context'
import { Button, Input, Label } from '@/components/ui'
import { Stethoscope } from 'lucide-react'
import { PLATFORM_STATS } from '@/components/layout/doctor-search'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'admin') router.push('/dashboard/admin')
      else if (user.role === 'doctor') router.push('/dashboard/doctor')
      else router.push('/dashboard/patient')
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.error ?? 'Login failed') : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — image */}
      <div className="relative hidden md:flex flex-1 flex-col overflow-hidden">
        <img
          src="/doctors/login-hero.jpg"
          alt="Doctor consultation"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-primary/30" />
        <div className="relative z-10 flex flex-col h-full p-10 text-white">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Stethoscope className="size-6" />
            DocBook
          </Link>
          <div className="mt-auto space-y-4">
            <h2 className="text-3xl font-bold leading-tight">Your health,<br />one click away.</h2>
            <p className="text-white/80 max-w-sm">
              Book online consultations with verified doctors. Get prescriptions and manage your health — all in one place.
            </p>
            <div className="flex gap-6 text-sm text-white/70 pt-2">
              <span>{PLATFORM_STATS.doctorCount} Doctors</span>
              <span>{PLATFORM_STATS.specializationCount} Specializations</span>
              <span>Video Consult</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full md:w-[480px] flex items-center justify-center px-8 py-12 shrink-0">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Stethoscope className="size-6" />
              <span className="text-xl font-bold">DocBook</span>
            </div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                className="h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
