'use client'

import Link from 'next/link'
import { useAuth } from '@/context'
import { Button } from '@/components/ui'
import { Stethoscope, Bell, LogOut, LayoutDashboard } from 'lucide-react'

export function Navbar() {
  const { user, logout } = useAuth()

  const dashboardPath = user
    ? user.role === 'admin'
      ? '/dashboard/admin'
      : user.role === 'doctor'
        ? '/dashboard/doctor'
        : '/dashboard/patient'
    : '/login'

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
          <Stethoscope className="size-5" />
          DocBook
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/doctors" className="text-muted-foreground hover:text-foreground transition-colors">
            Find Doctors
          </Link>
          {user && (
            <Link href={dashboardPath} className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href={dashboardPath}>
                <Button variant="ghost" size="icon-sm">
                  <Bell className="size-4" />
                </Button>
              </Link>
              <Link href={dashboardPath}>
                <Button variant="ghost" size="icon-sm">
                  <LayoutDashboard className="size-4" />
                </Button>
              </Link>
              <span className="hidden sm:inline text-sm text-muted-foreground">{user.name}</span>
              <Button variant="ghost" size="icon-sm" onClick={logout}>
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
