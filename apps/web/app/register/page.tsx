'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import { useAuth } from '@/context'
import { Button, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(name, email, password)
      router.push('/')
    } catch (err) {
      setError(
        isAxiosError(err)
          ? (err.response?.data?.error ?? 'Registration failed')
          : 'Registration failed',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-2">
      {/* Left panel */}
      <div className="relative hidden flex-col bg-zinc-900 p-10 text-white dark:border-r md:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="h-6 w-6 rounded-full bg-white/90" />
          Woolf Project
        </div>
        <div className="mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              &ldquo;This capstone project demonstrates a full-stack monorepo architecture
              with Express, Next.js, and PostgreSQL.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">MSc Computer Science — Scaler Neovarsity</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Enter your details below to create your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

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
