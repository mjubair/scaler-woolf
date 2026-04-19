'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { Navbar } from '@/components/layout/navbar'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  Search,
  Star,
  MapPin,
  GraduationCap,
  X,
  ChevronDown,
  Stethoscope,
  User,
  Heart,
  Brain,
  Bone,
  Baby,
  Eye,
  Ear,
  Pill,
  Flower2,
  ArrowLeft,
  Shield,
  Clock,
  Video,
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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const SPECIALIZATIONS = [
  { name: 'Cardiology', label: 'Heart & Cardiac Care', icon: Heart, color: 'text-red-500', bg: 'bg-red-50', startingFee: 1500, conditions: 'Chest Pain, Heart Disease, BP' },
  { name: 'Dermatology', label: 'Skin, Hair & Nails', icon: Flower2, color: 'text-pink-500', bg: 'bg-pink-50', startingFee: 800, conditions: 'Acne, Skin Rash, Hair Loss' },
  { name: 'ENT', label: 'Ear, Nose & Throat', icon: Ear, color: 'text-amber-500', bg: 'bg-amber-50', startingFee: 700, conditions: 'Sinus, Hearing Loss, Sore Throat' },
  { name: 'General Medicine', label: 'General Physician', icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-50', startingFee: 600, conditions: 'Fever, Cold, Cough, Diabetes' },
  { name: 'Gynecology', label: "Women's Health", icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50', startingFee: 1000, conditions: 'Period Problems, Pregnancy, PCOS' },
  { name: 'Neurology', label: 'Brain & Nervous System', icon: Brain, color: 'text-indigo-500', bg: 'bg-indigo-50', startingFee: 1800, conditions: 'Headache, Migraine, Seizures' },
  { name: 'Orthopedics', label: 'Bones & Joints', icon: Bone, color: 'text-orange-500', bg: 'bg-orange-50', startingFee: 1200, conditions: 'Back Pain, Knee Pain, Fractures' },
  { name: 'Pediatrics', label: 'Child Health', icon: Baby, color: 'text-teal-500', bg: 'bg-teal-50', startingFee: 1000, conditions: 'Vaccination, Child Fever, Growth' },
]

const POPULAR_SEARCHES = [
  { term: 'Fever', specialization: 'General Medicine' },
  { term: 'Skin Care', specialization: 'Dermatology' },
  { term: 'Back Pain', specialization: 'Orthopedics' },
  { term: 'Headache', specialization: 'Neurology' },
  { term: 'Child Vaccination', specialization: 'Pediatrics' },
  { term: 'Diabetes', specialization: 'General Medicine' },
]

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [activeSpecialization, setActiveSpecialization] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [view, setView] = useState<'browse' | 'results'>('browse')
  const [suggestedDoctors, setSuggestedDoctors] = useState<Doctor[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [filters, setFilters] = useState({ minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' as 'asc' | 'desc' })
  const [genderOpen, setGenderOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const genderRef = useRef<HTMLDivElement>(null)
  const ratingRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)

  const activeFilterCount = [filters.minFee, filters.minRating, filters.gender, filters.sortBy].filter(Boolean).length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    function handleDropdownClose(e: MouseEvent) {
      if (genderRef.current && !genderRef.current.contains(e.target as Node)) setGenderOpen(false)
      if (ratingRef.current && !ratingRef.current.contains(e.target as Node)) setRatingOpen(false)
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('mousedown', handleDropdownClose)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('mousedown', handleDropdownClose)
    }
  }, [])

  useEffect(() => {
    if (view === 'results') {
      fetchDoctors()
    }
  }, [page])

  // Refetch when filters change
  useEffect(() => {
    if (view === 'results') {
      fetchDoctors()
    }
  }, [filters])

  // Live doctor suggestions in dropdown
  useEffect(() => {
    if (query.length < 2) {
      setSuggestedDoctors([])
      return
    }
    setLoadingSuggestions(true)
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/doctors', {
          params: { search: query, limit: 3 },
        })
        setSuggestedDoctors(data.doctors)
      } catch {
        setSuggestedDoctors([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])


  async function fetchDoctors(overrides?: { search?: string; specialization?: string; resetFilters?: boolean }) {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 12 }
      const s = overrides?.search ?? activeSearch
      const sp = overrides?.specialization ?? activeSpecialization
      if (s) params.search = s
      if (sp) params.specialization = sp
      const f = overrides?.resetFilters ? { minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' as const } : filters
      if (f.gender) params.gender = f.gender
      if (f.minFee) params.minFee = f.minFee
      if (f.maxFee) params.maxFee = f.maxFee
      if (f.minRating) params.minRating = f.minRating
      if (f.sortBy) {
        params.sortBy = f.sortBy
        params.sortOrder = f.sortOrder
      }
      const { data } = await api.get('/api/doctors', { params })
      setDoctors(data.doctors)
      setPagination(data.pagination)
    } catch {
      // handle silently
    } finally {
      setLoading(false)
    }
  }

  function selectSpecialization(name: string) {
    setQuery(name)
    setActiveSearch('')
    setActiveSpecialization(name)
    setDropdownOpen(false)
    setView('results')
    setPage(1)
    fetchDoctors({ search: '', specialization: name })
  }

  function selectPopularSearch(term: string, specialization: string) {
    setQuery(term)
    setActiveSearch('')
    setActiveSpecialization(specialization)
    setDropdownOpen(false)
    setView('results')
    setPage(1)
    fetchDoctors({ search: '', specialization })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const matchedSpec = SPECIALIZATIONS.find(
      (s) => s.name.toLowerCase() === query.toLowerCase(),
    )
    if (matchedSpec) {
      selectSpecialization(matchedSpec.name)
    } else if (query) {
      setActiveSearch(query)
      setActiveSpecialization('')
      setDropdownOpen(false)
      setView('results')
      setPage(1)
      fetchDoctors({ search: query, specialization: '' })
    }
  }

  function backToBrowse() {
    setQuery('')
    setActiveSearch('')
    setActiveSpecialization('')
    setFilters({ minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' })
    setView('browse')
    setDoctors([])
    setPage(1)
  }

  function applyFilter(key: string, value: string) {
    const next = { ...filters, [key]: filters[key as keyof typeof filters] === value ? '' : value }
    setFilters(next)
    setPage(1)
  }

  function resetFilters() {
    const cleared = { minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' as const }
    setFilters(cleared)
    setPage(1)
    fetchDoctors({ resetFilters: true })
  }

  const filteredSpecs = query
    ? SPECIALIZATIONS.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.conditions.toLowerCase().includes(query.toLowerCase()),
      )
    : SPECIALIZATIONS

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Search Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${view === 'browse' ? 'py-10 sm:py-14' : 'py-5'}`}>
          {view === 'browse' && (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-2">Consult Top Doctors Online</h1>
              <p className="text-muted-foreground text-center mb-8 text-base">Private online consultations with verified doctors in 15 minutes</p>
            </>
          )}

          {/* Search bar */}
          <div className="max-w-2xl mx-auto relative" ref={searchRef}>
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search doctors, specializations, symptoms..."
                className="w-full h-13 sm:h-14 pl-12 pr-10 rounded-2xl border border-border bg-background text-sm sm:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
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
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </form>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
                {!query && (
                  <div className="px-4 pt-4 pb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Popular Searches</p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_SEARCHES.map((ps) => (
                        <button
                          key={ps.term}
                          type="button"
                          onClick={() => selectPopularSearch(ps.term, ps.specialization)}
                          className="px-3 py-1.5 rounded-full border border-border text-xs font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors"
                        >
                          {ps.term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                          onClick={() => selectSpecialization(spec.name)}
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

                {/* Matching doctors */}
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
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors"
                          >
                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                              {doc.userName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.userName}</p>
                              <p className="text-xs text-muted-foreground">{doc.specialization} &middot; Rs. {doc.consultationFee}</p>
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Doctor</span>
                          </Link>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSearch(query)
                            setActiveSpecialization('')
                            setDropdownOpen(false)
                            setView('results')
                            setPage(1)
                            fetchDoctors({ search: query, specialization: '' })
                          }}
                          className="w-full px-4 py-2.5 text-sm text-primary font-medium hover:bg-muted/60 transition-colors text-left"
                        >
                          See all results for &ldquo;{query}&rdquo; &rarr;
                        </button>
                      </>
                    ) : !loadingSuggestions ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSearch(query)
                          setActiveSpecialization('')
                          setDropdownOpen(false)
                          setView('results')
                          setPage(1)
                          fetchDoctors({ search: query, specialization: '' })
                        }}
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
        </div>
      </div>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        {view === 'results' && (
          <button
            onClick={backToBrowse}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to all specializations
          </button>
        )}

        {view === 'browse' ? (
          <>
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-10 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-green-600" />
                <span>Verified Doctors</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-blue-600" />
                <span>Available in 15 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="size-5 text-purple-600" />
                <span>Video Consultation</span>
              </div>
            </div>

            {/* Specialization cards grid */}
            <h2 className="text-xl font-semibold mb-5">Consult by Specialization</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SPECIALIZATIONS.map((spec) => {
                const Icon = spec.icon
                return (
                  <button
                    key={spec.name}
                    onClick={() => selectSpecialization(spec.name)}
                    className="group text-left rounded-2xl border border-border bg-background p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
                  >
                    <div className={`size-12 rounded-xl ${spec.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`size-6 ${spec.color}`} />
                    </div>
                    <h3 className="font-semibold text-base mb-0.5">{spec.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{spec.conditions}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">
                        From Rs. {spec.startingFee}
                      </span>
                      <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Consult Now &rarr;
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* How it works */}
            <div className="mt-14 mb-4">
              <h2 className="text-xl font-semibold mb-6 text-center">How Online Consultation Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { step: '1', title: 'Choose a Doctor', desc: 'Pick a specialization or search for a doctor by name. View profiles, ratings, and fees.' },
                  { step: '2', title: 'Book & Pay', desc: 'Select a convenient time slot, pay securely via Razorpay, and get instant confirmation.' },
                  { step: '3', title: 'Consult Online', desc: 'Join via Google Meet at your appointment time. Get prescriptions and follow-up notes.' },
                ].map((item) => (
                  <div key={item.step} className="text-center px-4">
                    <div className="size-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                      {item.step}
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold tracking-tight">
                {activeSpecialization ? `${activeSpecialization} Doctors` : `Results for "${activeSearch}"`}
              </h2>
              <p className="text-sm text-muted-foreground">{pagination?.total || 0} doctors available</p>
            </div>

            {/* Filter bar */}
            <div className="mb-6 space-y-3">
              {/* Active search pill + filter pills row */}
              <div className="flex flex-wrap items-center gap-2">
                {(activeSpecialization || activeSearch) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {activeSpecialization || activeSearch}
                    <X className="size-3.5 cursor-pointer hover:text-primary/70" onClick={backToBrowse} />
                  </span>
                )}

                <div className="flex-1" />

                {/* Gender filter */}
                <div className="relative" ref={genderRef}>
                  <button
                    onClick={() => { setGenderOpen(!genderOpen); setSortOpen(false) }}
                    className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      filters.gender
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/30'
                    }`}
                  >
                    {filters.gender ? (filters.gender === 'male' ? 'Male Doctor' : 'Female Doctor') : 'Gender'}
                    <ChevronDown className={`size-4 ${filters.gender ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </button>
                  {genderOpen && (
                    <div className="absolute z-50 mt-1 w-40 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                      {[
                        { value: '', label: 'All' },
                        { value: 'male', label: 'Male Doctor' },
                        { value: 'female', label: 'Female Doctor' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setFilters((f) => ({ ...f, gender: opt.value }))
                            setGenderOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                            filters.gender === opt.value ? 'bg-muted font-medium' : ''
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rating filter */}
                <div className="relative" ref={ratingRef}>
                  <button
                    onClick={() => { setRatingOpen(!ratingOpen); setGenderOpen(false); setSortOpen(false) }}
                    className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      filters.minRating
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/30'
                    }`}
                  >
                    {filters.minRating ? (
                      <><Star className="size-3.5 fill-current" /> {filters.minRating}+ Rating</>
                    ) : (
                      'Rating'
                    )}
                    <ChevronDown className={`size-4 ${filters.minRating ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </button>
                  {ratingOpen && (
                    <div className="absolute z-50 mt-1 w-40 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                      {[
                        { value: '', label: 'All Ratings' },
                        { value: '4', label: '4+ Stars' },
                        { value: '3', label: '3+ Stars' },
                        { value: '2', label: '2+ Stars' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setFilters((f) => ({ ...f, minRating: opt.value }))
                            setRatingOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5 ${
                            filters.minRating === opt.value ? 'bg-muted font-medium' : ''
                          }`}
                        >
                          {opt.value && <Star className="size-3.5 fill-yellow-400 text-yellow-400" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Reset Filters
                  </button>
                )}

                {/* Sort dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => { setSortOpen(!sortOpen); setGenderOpen(false) }}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground border border-primary transition-colors"
                  >
                    {filters.sortBy
                      ? ({ 'rating-desc': 'Rating: High to Low', 'rating-asc': 'Rating: Low to High', 'fee-asc': 'Fee: Low to High', 'fee-desc': 'Fee: High to Low', 'experience-desc': 'Most Experienced', 'experience-asc': 'Least Experienced' } as Record<string, string>)[`${filters.sortBy}-${filters.sortOrder}`] || 'Relevance'
                      : 'Relevance'
                    }
                    <ChevronDown className="size-4 text-primary-foreground" />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                      {[
                        { value: '', label: 'Relevance' },
                        { value: 'rating-desc', label: 'Rating: High to Low' },
                        { value: 'rating-asc', label: 'Rating: Low to High' },
                        { value: 'fee-asc', label: 'Fee: Low to High' },
                        { value: 'fee-desc', label: 'Fee: High to Low' },
                        { value: 'experience-desc', label: 'Most Experienced' },
                        { value: 'experience-asc', label: 'Least Experienced' },
                      ].map((opt) => {
                        const currentVal = filters.sortBy ? `${filters.sortBy}-${filters.sortOrder}` : ''
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              if (!opt.value) {
                                setFilters((f) => ({ ...f, sortBy: '', sortOrder: 'desc' }))
                              } else {
                                const [sortBy, sortOrder] = opt.value.split('-') as [string, 'asc' | 'desc']
                                setFilters((f) => ({ ...f, sortBy, sortOrder }))
                              }
                              setSortOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                              currentVal === opt.value ? 'bg-muted font-medium' : ''
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Doctor results */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-4">No doctors found. Try a different search.</p>
                <Button variant="outline" onClick={backToBrowse}>Browse all specializations</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctors.map((doctor) => (
                    <Link key={doctor.id} href={`/doctors/${doctor.id}`}>
                      <Card className="hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                              {doctor.userName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="truncate">{doctor.userName}</CardTitle>
                              <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-1 text-sm">
                            <GraduationCap className="size-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground truncate">{doctor.qualification}</span>
                          </div>
                          {doctor.hospitalName && (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="size-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground truncate">{doctor.hospitalName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <Star className="size-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{Number(doctor.avgRating).toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">({doctor.totalReviews})</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold">Rs. {doctor.consultationFee}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground px-3">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
