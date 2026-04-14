'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import { useAuth } from '@/context'
import { Button, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Stethoscope, User } from 'lucide-react'

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
      if (user.role === 'doctor') {
        router.push('/dashboard/doctor/profile')
      } else {
        router.push('/dashboard/patient')
      }
    } catch (err) {
      setError(
        isAxiosError(err) ? (err.response?.data?.error ?? 'Registration failed') : 'Registration failed',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-2">
      {/* Left panel */}
      <div className="relative hidden flex-col bg-zinc-900 p-10 text-white dark:border-r md:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Stethoscope className="size-6" />
          DocBook
        </Link>
        <div className="mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              &ldquo;Join our platform to connect with verified doctors or offer
              your medical expertise to patients who need it.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">DocBook — Online Consultation Platform</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">Choose your role and enter your details</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-all',
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
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-all',
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
                className="h-9"
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
                className="h-9"
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
                className="h-9"
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
                className="h-9"
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

          <p className={cn('px-8 text-center text-sm text-muted-foreground')}>
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
