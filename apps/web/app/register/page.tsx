'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import { useAuth } from '@/context'
import { Button, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Stethoscope, User } from 'lucide-react'
import { PLATFORM_STATS } from '@/components/layout/doctor-search'

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await register(name, email, password, role, phone || undefined)
      if (user.role === 'doctor') router.push('/dashboard/doctor/profile')
      else router.push('/dashboard/patient')
    } catch (err) {
      setError(
        isAxiosError(err) ? (err.response?.data?.error ?? 'Registration failed') : 'Registration failed',
      )
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
            <h2 className="text-3xl font-bold leading-tight">Join our<br />healthcare platform.</h2>
            <p className="text-white/80 max-w-sm">
              Connect with verified doctors or offer your medical expertise to patients who need it.
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
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-sm text-muted-foreground">Choose your role and enter your details</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all',
                role === 'patient'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50',
              )}
            >
              <User className="size-6" />
              <span className="font-medium">Patient</span>
              <span className="text-xs text-center">Book consultations</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all',
                role === 'doctor'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50',
              )}
            >
              <Stethoscope className="size-6" />
              <span className="font-medium">Doctor</span>
              <span className="text-xs text-center">Offer consultations</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder={role === 'doctor' ? 'Dr. John Doe' : 'John Doe'}
                autoComplete="name"
                className="h-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                className="h-10"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading
                ? 'Creating account...'
                : role === 'doctor'
                  ? 'Register as Doctor'
                  : 'Register as Patient'}
            </Button>
          </form>

          {role === 'doctor' && (
            <p className="text-xs text-center text-muted-foreground">
              Doctor accounts require admin approval before you can receive bookings.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
