'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Clock,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  Settings,
  Star,
  Stethoscope,
  Users,
  CreditCard,
} from 'lucide-react'

interface SidebarLink {
  href: string
  label: string
  icon: React.ReactNode
}

const patientLinks: SidebarLink[] = [
  { href: '/dashboard/patient', label: 'Overview', icon: <Home className="size-4" /> },
  { href: '/dashboard/patient/appointments', label: 'My Appointments', icon: <Calendar className="size-4" /> },
  { href: '/dashboard/patient/prescriptions', label: 'Prescriptions', icon: <FileText className="size-4" /> },
  { href: '/dashboard/patient/medical-history', label: 'Medical History', icon: <Heart className="size-4" /> },
  { href: '/dashboard/patient/profile', label: 'Profile', icon: <Settings className="size-4" /> },
]

const doctorLinks: SidebarLink[] = [
  { href: '/dashboard/doctor', label: 'Overview', icon: <Home className="size-4" /> },
  { href: '/dashboard/doctor/appointments', label: 'Appointments', icon: <Calendar className="size-4" /> },
  { href: '/dashboard/doctor/availability', label: 'Availability', icon: <Clock className="size-4" /> },
  { href: '/dashboard/doctor/prescriptions', label: 'Prescriptions', icon: <FileText className="size-4" /> },
  { href: '/dashboard/doctor/reviews', label: 'Reviews', icon: <Star className="size-4" /> },
  { href: '/dashboard/doctor/calendar', label: 'Google Calendar', icon: <LayoutDashboard className="size-4" /> },
  { href: '/dashboard/doctor/profile', label: 'Profile', icon: <Settings className="size-4" /> },
]

const adminLinks: SidebarLink[] = [
  { href: '/dashboard/admin', label: 'Overview', icon: <Home className="size-4" /> },
  { href: '/dashboard/admin/doctors', label: 'Doctors', icon: <Stethoscope className="size-4" /> },
  { href: '/dashboard/admin/patients', label: 'Patients', icon: <Users className="size-4" /> },
  { href: '/dashboard/admin/appointments', label: 'Appointments', icon: <Calendar className="size-4" /> },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const links =
    user?.role === 'admin'
      ? adminLinks
      : user?.role === 'doctor'
        ? doctorLinks
        : patientLinks

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-muted/30 p-4 gap-1">
      <div className="mb-4 px-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'doctor' ? 'Doctor Panel' : 'Patient Panel'}
        </p>
      </div>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === link.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {link.icon}
          {link.label}
        </Link>
      ))}
    </aside>
  )
}
