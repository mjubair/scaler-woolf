'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import { useAuth } from '@/context'
import { Button, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Stethoscope } from 'lucide-react'

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
      if (user.role === 'admin') {
        router.push('/dashboard/admin')
      } else if (user.role === 'doctor') {
        router.push('/dashboard/doctor')
      } else {
        router.push('/dashboard/patient')
      }
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.error ?? 'Login failed') : 'Login failed')
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
              &ldquo;Book online consultations with verified doctors.
              Get prescriptions and manage your health — all in one place.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">DocBook — Online Consultation Platform</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
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
                className="h-9"
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
                className="h-9"
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

          <p className={cn('px-8 text-center text-sm text-muted-foreground')}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
