'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context'
import { Button } from '@/components/ui'
import { Stethoscope, Bell, Search, ChevronDown, LayoutDashboard, User, LogOut, Calendar, FileText, Heart } from 'lucide-react'
import { DoctorSearch } from './doctor-search'
import { AuthDrawer } from './auth-drawer'

export function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [authDrawer, setAuthDrawer] = useState<'login' | 'register' | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const dashboardPath = user
    ? user.role === 'admin'
      ? '/dashboard/admin'
      : user.role === 'doctor'
        ? '/dashboard/doctor'
        : '/dashboard/patient'
    : '/login'

  const isHomePage = pathname === '/'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const profileLinks = user?.role === 'patient' ? [
    { href: `${dashboardPath}`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `${dashboardPath}/appointments`, label: 'My Appointments', icon: Calendar },
    { href: `${dashboardPath}/prescriptions`, label: 'Prescriptions', icon: FileText },
    { href: `${dashboardPath}/medical-history`, label: 'Medical History', icon: Heart },
    { href: `${dashboardPath}/profile`, label: 'Profile', icon: User },
  ] : user?.role === 'doctor' ? [
    { href: `${dashboardPath}`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `${dashboardPath}/appointments`, label: 'Appointments', icon: Calendar },
    { href: `${dashboardPath}/prescriptions`, label: 'Prescriptions', icon: FileText },
    { href: `${dashboardPath}/availability`, label: 'Availability', icon: Calendar },
    { href: `${dashboardPath}/profile`, label: 'Profile', icon: User },
  ] : [
    { href: `${dashboardPath}`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `${dashboardPath}/doctors`, label: 'Doctors', icon: User },
    { href: `${dashboardPath}/patients`, label: 'Patients', icon: User },
    { href: `${dashboardPath}/appointments`, label: 'Appointments', icon: Calendar },
  ]

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary shrink-0">
          <Stethoscope className="size-5" />
          <span className="hidden sm:inline">DocBook</span>
        </Link>

        {/* Search — hidden on homepage */}
        {!isHomePage && (
          <div className="hidden md:block flex-1 max-w-md mx-auto">
            <DoctorSearch variant="navbar" />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {!isHomePage && (
            <Link href="/doctors" className="md:hidden">
              <Button variant="ghost" size="icon-sm">
                <Search className="size-4" />
              </Button>
            </Link>
          )}
          {user ? (
            <>
              <Link href={dashboardPath}>
                <Button variant="ghost" size="icon-sm">
                  <Bell className="size-4" />
                </Button>
              </Link>

              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-primary font-medium capitalize mt-0.5">{user.role}</p>
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      {profileLinks.map((link) => {
                        const Icon = link.icon
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                          >
                            <Icon className="size-4 text-muted-foreground" />
                            {link.label}
                          </Link>
                        )
                      })}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border py-1">
                      <button
                        onClick={() => { logout(); setProfileOpen(false) }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors w-full text-left"
                      >
                        <LogOut className="size-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAuthDrawer('login')}>Sign in</Button>
              <Button size="sm" onClick={() => setAuthDrawer('register')}>Get Started</Button>
            </>
          )}
        </div>
      </div>

    </header>
      <AuthDrawer
        open={authDrawer !== null}
        onClose={() => setAuthDrawer(null)}
        initialView={authDrawer || 'login'}
      />
    </>
  )
}
