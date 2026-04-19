'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/axios'
import {
  Search,
  X,
  Stethoscope,
  User,
  Heart,
  Brain,
  Bone,
  Baby,
  Ear,
  Flower2,
  Shield,
} from 'lucide-react'

interface Doctor {
  id: number
  specialization: string
  qualification: string
  experience: number
  consultationFee: string
  avgRating: string
  totalReviews: number
  hospitalName: string | null
  userName: string
  userAvatar: string | null
}

export const SPECIALIZATIONS = [
  { name: 'Cardiology', label: 'Heart & Cardiac Care', icon: Heart, color: 'text-red-500', bg: 'bg-red-50', startingFee: 1500, conditions: 'Chest Pain, Heart Disease, BP' },
  { name: 'Dermatology', label: 'Skin, Hair & Nails', icon: Flower2, color: 'text-pink-500', bg: 'bg-pink-50', startingFee: 800, conditions: 'Acne, Skin Rash, Hair Loss' },
  { name: 'ENT', label: 'Ear, Nose & Throat', icon: Ear, color: 'text-amber-500', bg: 'bg-amber-50', startingFee: 700, conditions: 'Sinus, Hearing Loss, Sore Throat' },
  { name: 'General Medicine', label: 'General Physician', icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-50', startingFee: 600, conditions: 'Fever, Cold, Cough, Diabetes' },
  { name: 'Gynecology', label: "Women's Health", icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50', startingFee: 1000, conditions: 'Period Problems, Pregnancy, PCOS' },
  { name: 'Neurology', label: 'Brain & Nervous System', icon: Brain, color: 'text-indigo-500', bg: 'bg-indigo-50', startingFee: 1800, conditions: 'Headache, Migraine, Seizures' },
  { name: 'Orthopedics', label: 'Bones & Joints', icon: Bone, color: 'text-orange-500', bg: 'bg-orange-50', startingFee: 1200, conditions: 'Back Pain, Knee Pain, Fractures' },
  { name: 'Pediatrics', label: 'Child Health', icon: Baby, color: 'text-teal-500', bg: 'bg-teal-50', startingFee: 1000, conditions: 'Vaccination, Child Fever, Growth' },
]

export const PLATFORM_STATS = {
  doctorCount: '33+',
  specializationCount: '8',
  highlights: ['Video Consult'],
} as const

export const POPULAR_SEARCHES = [
  { term: 'Fever', specialization: 'General Medicine' },
  { term: 'Skin Care', specialization: 'Dermatology' },
  { term: 'Back Pain', specialization: 'Orthopedics' },
  { term: 'Headache', specialization: 'Neurology' },
  { term: 'Child Vaccination', specialization: 'Pediatrics' },
  { term: 'Diabetes', specialization: 'General Medicine' },
]

interface DoctorSearchProps {
  variant?: 'hero' | 'navbar'
  onSelect?: (type: 'specialization' | 'search', value: string) => void
}

export function DoctorSearch({ variant = 'hero', onSelect }: DoctorSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [suggestedDoctors, setSuggestedDoctors] = useState<Doctor[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setSuggestedDoctors([])
      return
    }
    setLoadingSuggestions(true)
    const abortController = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/doctors', {
          params: { search: query, limit: 3 },
          signal: abortController.signal,
        })
        setSuggestedDoctors(data.doctors)
      } catch {
        if (!abortController.signal.aborted) {
          setSuggestedDoctors([])
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingSuggestions(false)
        }
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      abortController.abort()
    }
  }, [query])

  const filteredSpecs = query
    ? SPECIALIZATIONS.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.conditions.toLowerCase().includes(query.toLowerCase()),
      )
    : SPECIALIZATIONS

  function navigate(type: 'specialization' | 'search', value: string) {
    setQuery('')
    setDropdownOpen(false)
    if (onSelect) {
      onSelect(type, value)
    } else {
      if (type === 'specialization') {
        router.push(`/doctors?specialization=${encodeURIComponent(value)}`)
      } else {
        router.push(`/doctors?search=${encodeURIComponent(value)}`)
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const matchedSpec = SPECIALIZATIONS.find((s) => s.name.toLowerCase() === query.toLowerCase())
    if (matchedSpec) {
      navigate('specialization', matchedSpec.name)
    } else {
      navigate('search', query)
    }
  }

  const isNavbar = variant === 'navbar'

  return (
    <div className={`relative ${isNavbar ? 'flex-1 max-w-md' : 'max-w-2xl mx-auto'}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isNavbar ? 'size-4' : 'size-5 left-4'}`} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search doctors, specializations, symptoms..."
          className={`w-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors ${
            isNavbar
              ? 'h-9 pl-9 pr-8 rounded-full bg-muted/30'
              : 'h-13 sm:h-14 pl-12 pr-10 rounded-2xl shadow-sm sm:text-base'
          }`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setDropdownOpen(true)
          }}
          onFocus={() => setDropdownOpen(true)}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${isNavbar ? 'right-3' : 'right-4'}`}
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {dropdownOpen && (
        <div className={`absolute z-50 mt-2 w-full rounded-2xl border border-border bg-background shadow-xl overflow-hidden ${isNavbar ? 'min-w-[360px] right-0' : ''}`}>
          {/* Popular searches */}
          {!query && (
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Popular Searches</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((ps) => (
                  <button
                    key={ps.term}
                    type="button"
                    onClick={() => navigate('specialization', ps.specialization)}
                    className="px-3 py-1.5 rounded-full border border-border text-xs font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  >
                    {ps.term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Specializations */}
          <div className="border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">
              {query ? 'Matching Specializations' : 'Specializations'}
            </p>
            <div className="max-h-72 overflow-y-auto pb-2">
              {filteredSpecs.map((spec) => {
                const Icon = spec.icon
                return (
                  <button
                    key={spec.name}
                    type="button"
                    onClick={() => navigate('specialization', spec.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className={`size-9 rounded-lg ${spec.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`size-4.5 ${spec.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{spec.name}</p>
                      <p className="text-xs text-muted-foreground">{spec.conditions}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Specialty</span>
                  </button>
                )
              })}
              {query && filteredSpecs.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">No specializations match</p>
              )}
            </div>
          </div>

          {/* Doctor suggestions */}
          {query && query.length >= 2 && (
            <div className="border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">
                {loadingSuggestions ? 'Searching Doctors...' : 'Doctors'}
              </p>
              {suggestedDoctors.length > 0 ? (
                <>
                  {suggestedDoctors.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/doctors/${doc.id}`}
                      onClick={() => { setDropdownOpen(false); setQuery('') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors"
                    >
                      {doc.userAvatar ? (
                        <img src={doc.userAvatar} alt={doc.userName} className="size-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                          {doc.userName.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.userName}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialization} &middot; Rs. {doc.consultationFee}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Doctor</span>
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigate('search', query)}
                    className="w-full px-4 py-2.5 text-sm text-primary font-medium hover:bg-muted/60 transition-colors text-left"
                  >
                    See all results for &ldquo;{query}&rdquo; &rarr;
                  </button>
                </>
              ) : !loadingSuggestions ? (
                <button
                  type="button"
                  onClick={() => navigate('search', query)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="size-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <User className="size-4.5 text-gray-500" />
                  </div>
                  <p className="text-sm">Search all doctors for <span className="font-semibold">&ldquo;{query}&rdquo;</span></p>
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
