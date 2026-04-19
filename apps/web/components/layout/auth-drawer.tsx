'use client'

import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useAuth, type User as AuthUser } from '@/context'
import { Button, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { X, Stethoscope, User } from 'lucide-react'
import { PLATFORM_STATS } from './doctor-search'

interface AuthDrawerProps {
  open: boolean
  onClose: () => void
  initialView?: 'login' | 'register'
  onSuccess?: (user: AuthUser) => void
}

export function AuthDrawer({ open, onClose, initialView = 'login', onSuccess }: AuthDrawerProps) {
  const { login, register } = useAuth()
  const [view, setView] = useState<'login' | 'register'>(initialView)

  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setView(initialView)
  }, [open, initialView])

  // Close on Escape key and trap focus within drawer
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Focus trap: Tab cycles within the drawer
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    // Auto-focus first focusable element in drawer
    requestAnimationFrame(() => {
      const firstInput = drawerRef.current?.querySelector<HTMLElement>('input, button')
      firstInput?.focus()
    })
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register state
  const [name, setName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(loginEmail, loginPassword)
      onClose()
      onSuccess?.(user)
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.error ?? 'Login failed') : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await register(name, regEmail, regPassword, role, phone || undefined)
      onClose()
      onSuccess?.(user)
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.error ?? 'Registration failed') : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  function switchView(v: 'login' | 'register') {
    setView(v)
    setError(null)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={view === 'login' ? 'Sign in' : 'Create an account'}
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-background shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2 text-primary">
            <Stethoscope className="size-5" />
            <span className="text-lg font-bold">DocBook</span>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center p-6">
          {view === 'login' ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Welcome back</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your credentials to sign in
                </p>
              </div>

              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="drawer-email">Email</Label>
                  <Input
                    id="drawer-email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="h-10"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="drawer-password">Password</Label>
                  <Input
                    id="drawer-password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-10"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" size="lg" disabled={loading} className="w-full">
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don&apos;t have an account?{' '}
                <button onClick={() => switchView('register')} className="text-primary font-medium hover:underline">
                  Sign up
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Create an account</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose your role and enter your details
                </p>
              </div>

              {/* Role selector */}
              <div className="grid grid-cols-2 gap-3 mb-5">
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
                  <User className="size-5" />
                  <span className="font-medium">Patient</span>
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
                  <Stethoscope className="size-5" />
                  <span className="font-medium">Doctor</span>
                </button>
              </div>

              <form onSubmit={handleRegister} className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="drawer-name">Full Name</Label>
                  <Input
                    id="drawer-name"
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
                  <Label htmlFor="drawer-reg-email">Email</Label>
                  <Input
                    id="drawer-reg-email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="h-10"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="drawer-phone">Phone (optional)</Label>
                  <Input
                    id="drawer-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    className="h-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="drawer-reg-password">Password</Label>
                  <Input
                    id="drawer-reg-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="h-10"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
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
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Doctor accounts require admin approval before you can receive bookings.
                </p>
              )}

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <button onClick={() => switchView('login')} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </p>
            </>
          )}

        </div>

        {/* Fixed bottom info */}
        <div className="mt-auto px-6 py-6 bg-primary/10 border-t border-primary/10">
          <p className="text-base font-bold text-foreground">
            Your health, one click away.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Book online consultations with verified doctors. Get prescriptions and manage your health — all in one place.
          </p>
          <div className="flex gap-5 mt-3 text-xs font-semibold text-primary">
            <span>{PLATFORM_STATS.doctorCount} Doctors</span>
            <span>{PLATFORM_STATS.specializationCount} Specializations</span>
            <span>Video Consult</span>
          </div>
        </div>
      </div>
    </>
  )
}
