'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/axios'
import { Navbar } from '@/components/layout/navbar'
import { SPECIALIZATIONS } from '@/components/layout/doctor-search'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  Star,
  MapPin,
  GraduationCap,
  X,
  ChevronDown,
  Stethoscope,
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

function DoctorsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [activeSpecialization, setActiveSpecialization] = useState('')
  const [view, setView] = useState<'browse' | 'results'>('browse')
  const [filters, setFilters] = useState({ minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' as 'asc' | 'desc' })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)

  // Guard to prevent the filter→URL→filter infinite loop.
  // When true, filter changes came from URL sync and should NOT push back to URL.
  const syncingFromUrl = useRef(false)

  const activeFilterCount = [filters.minFee, filters.minRating, filters.gender, filters.sortBy].filter(Boolean).length

  // Read filters from URL on mount and when searchParams change
  const specParam = searchParams.get('specialization') || ''
  const searchParam = searchParams.get('search') || ''
  const genderParam = searchParams.get('gender') || ''
  const minRatingParam = searchParams.get('minRating') || ''
  const sortByParam = searchParams.get('sortBy') || ''
  const sortOrderParam = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  const fetchDoctors = useCallback(async (overrides?: { search?: string; specialization?: string; resetFilters?: boolean; append?: boolean; pageNum?: number; filtersSnapshot?: typeof filters }) => {
    const isAppend = overrides?.append
    if (isAppend) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    try {
      const params: Record<string, string | number> = { page: overrides?.pageNum ?? page, limit: 12 }
      const s = overrides?.search ?? activeSearch
      const sp = overrides?.specialization ?? activeSpecialization
      if (s) params.search = s
      if (sp) params.specialization = sp
      const f = overrides?.resetFilters
        ? { minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' as const }
        : (overrides?.filtersSnapshot ?? filters)
      if (f.gender) params.gender = f.gender
      if (f.minFee) params.minFee = f.minFee
      if (f.maxFee) params.maxFee = f.maxFee
      if (f.minRating) params.minRating = f.minRating
      if (f.sortBy) {
        params.sortBy = f.sortBy
        params.sortOrder = f.sortOrder
      }
      const { data } = await api.get('/api/doctors', { params })
      if (isAppend) {
        setDoctors((prev) => [...prev, ...data.doctors])
      } else {
        setDoctors(data.doctors)
      }
      setPagination(data.pagination)
    } catch {
      // handle silently
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [page, activeSearch, activeSpecialization, filters])

  // Sync state from URL params — this is the single source of truth
  useEffect(() => {
    syncingFromUrl.current = true
    const matched = specParam ? SPECIALIZATIONS.find((s) => s.name.toLowerCase() === specParam.toLowerCase()) : null
    const newSpec = matched?.name || ''
    const newFilters = { ...filters, gender: genderParam, minRating: minRatingParam, sortBy: sortByParam, sortOrder: sortOrderParam }

    setActiveSpecialization(newSpec)
    setActiveSearch(searchParam)
    setQuery(newSpec || searchParam)
    setFilters(newFilters)
    setView('results')
    setPage(1)
    fetchDoctors({
      search: searchParam,
      specialization: newSpec,
      filtersSnapshot: newFilters,
    })

    // Allow the ref to persist through the current render cycle
    requestAnimationFrame(() => { syncingFromUrl.current = false })
  }, [specParam, searchParam, genderParam, minRatingParam, sortByParam, sortOrderParam])

  useEffect(() => {
    function handleDropdownClose(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleDropdownClose)
    return () => document.removeEventListener('mousedown', handleDropdownClose)
  }, [])

  // Refetch when filters change from user interaction (not URL sync)
  useEffect(() => {
    if (syncingFromUrl.current) return
    if (view === 'results') {
      setPage(1)
      pushFiltersToUrl()
      fetchDoctors()
    }
  }, [filters])

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchDoctors({ append: true, pageNum: nextPage })
  }

  function pushFiltersToUrl(overrides: { specialization?: string; search?: string; gender?: string; minRating?: string; sortBy?: string; sortOrder?: string } = {}) {
    const params = new URLSearchParams()
    const spec = overrides.specialization ?? activeSpecialization
    const search = overrides.search ?? activeSearch
    const gender = overrides.gender ?? filters.gender
    const minRating = overrides.minRating ?? filters.minRating
    const sortBy = overrides.sortBy ?? filters.sortBy
    const sortOrder = overrides.sortOrder ?? filters.sortOrder
    if (spec) params.set('specialization', spec)
    if (search) params.set('search', search)
    if (gender) params.set('gender', gender)
    if (minRating) params.set('minRating', minRating)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortOrder', sortOrder) }
    const qs = params.toString()
    router.push(qs ? `/doctors?${qs}` : '/doctors', { scroll: false })
  }

  function selectSpecialization(name: string) {
    setQuery(name)
    setActiveSearch('')
    setActiveSpecialization(name)
    setView('results')
    setPage(1)
    pushFiltersToUrl({ specialization: name, search: '' })
    fetchDoctors({ search: '', specialization: name })
  }


  function backToBrowse() {
    setQuery('')
    setActiveSearch('')
    setActiveSpecialization('')
    setFilters({ minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' })
    setView('browse')
    setDoctors([])
    setPage(1)
    router.push('/doctors', { scroll: false })
  }

  function applyFilter(key: string, value: string) {
    const next = { ...filters, [key]: filters[key as keyof typeof filters] === value ? '' : value }
    setFilters(next)
  }

  function resetFilters() {
    const cleared = { minFee: '', maxFee: '', minRating: '', gender: '', sortBy: '', sortOrder: 'desc' as const }
    setFilters(cleared)
    setPage(1)
    pushFiltersToUrl({ gender: '', minRating: '', sortBy: '', sortOrder: 'desc' })
    fetchDoctors({ resetFilters: true })
  }

  function handleSidebarSpecialization(name: string) {
    if (name === activeSpecialization || name === '') {
      setActiveSpecialization('')
      setQuery('')
      setPage(1)
      pushFiltersToUrl({ specialization: '' })
      fetchDoctors({ search: activeSearch, specialization: '' })
    } else {
      setActiveSpecialization(name)
      setQuery(name)
      setPage(1)
      pushFiltersToUrl({ specialization: name, search: '' })
      fetchDoctors({ search: '', specialization: name })
    }
  }

  function handleSidebarGender(value: string) {
    setFilters((f) => ({ ...f, gender: value }))
  }

  function handleSidebarRating(value: string) {
    setFilters((f) => ({ ...f, minRating: value }))
  }

  function renderSidebarFilters() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Specialization</h3>
          <div className="space-y-0.5">
            <label className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
              <input type="checkbox" checked={!activeSpecialization} onChange={() => handleSidebarSpecialization('')} className="size-4 rounded border-border accent-primary" />
              <span className="text-sm font-medium">All Specialties</span>
            </label>
            {SPECIALIZATIONS.map((spec) => (
              <label key={spec.name} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
                <input type="checkbox" checked={activeSpecialization === spec.name} onChange={() => handleSidebarSpecialization(spec.name)} className="size-4 rounded border-border accent-primary" />
                <span className="text-sm">{spec.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="border-t border-border/50 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Gender</h3>
          <div className="space-y-0.5">
            {[{ value: '', label: 'All' }, { value: 'male', label: 'Male Doctor' }, { value: 'female', label: 'Female Doctor' }].map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
                <input type="radio" name="sidebar-gender" checked={filters.gender === opt.value} onChange={() => handleSidebarGender(opt.value)} className="size-4 border-border accent-primary" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="border-t border-border/50 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Rating</h3>
          <div className="space-y-0.5">
            {[{ value: '', label: 'All Ratings' }, { value: '4', label: '4+ Stars' }, { value: '3', label: '3+ Stars' }, { value: '2', label: '2+ Stars' }].map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
                <input type="radio" name="sidebar-rating" checked={filters.minRating === opt.value} onChange={() => handleSidebarRating(opt.value)} className="size-4 border-border accent-primary" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="text-sm text-primary font-medium hover:underline">
            Reset All Filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
          <div className="flex gap-8">
            {/* Sidebar — desktop only */}
            <aside className="hidden lg:block w-60 shrink-0">
              <div className="sticky top-20">
                {renderSidebarFilters()}
              </div>
            </aside>

            {/* Main results area */}
            <div className="flex-1 min-w-0">
              {/* Mobile filter toggle */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  <Stethoscope className="size-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="size-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </button>
                {mobileFiltersOpen && (
                  <div className="mt-3 p-4 rounded-xl border border-border bg-background">
                    {renderSidebarFilters()}
                  </div>
                )}
              </div>

              {/* Header + sort bar */}
              <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {activeSpecialization ? `${activeSpecialization} Doctors` : `Results for "${activeSearch}"`}
                  </h2>
                  <p className="text-sm text-muted-foreground">{pagination?.total || 0} doctors available</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Sort dropdown */}
                  <div className="relative" ref={sortRef}>
                    <button
                      onClick={() => setSortOpen(!sortOpen)}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground transition-colors"
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {doctors.map((doctor) => (
                    <Link key={doctor.id} href={`/doctors/${doctor.id}`}>
                      <Card className="hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer h-full overflow-hidden !p-0 !gap-0 flex-row">
                        {/* Left: Full-height photo */}
                        {doctor.userAvatar ? (
                          <img src={doctor.userAvatar} alt={doctor.userName} className="w-28 shrink-0 object-cover !rounded-none" />
                        ) : (
                          <div className="w-28 shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                            {doctor.userName.charAt(0)}
                          </div>
                        )}
                        {/* Right: Details */}
                        <div className="flex-1 min-w-0 p-4 flex flex-col">
                          <h3 className="text-lg font-bold truncate">{doctor.userName}</h3>
                          <p className="text-primary font-semibold mb-2">{doctor.specialization}</p>
                          <div className="space-y-1 mb-auto">
                            <div className="flex items-center gap-1.5 text-sm">
                              <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground truncate text-xs">{doctor.qualification}</span>
                            </div>
                            {doctor.hospitalName && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground truncate text-xs">{doctor.hospitalName}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-3 mt-3 border-t">
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{Number(doctor.avgRating).toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">({doctor.totalReviews})</span>
                            </div>
                            <span className="text-sm font-bold">Rs. {doctor.consultationFee}</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Load More */}
                {pagination && page < pagination.totalPages && (
                  <div className="flex flex-col items-center gap-2 mt-8">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin h-4 w-4 rounded-full border-2 border-primary border-t-transparent" />
                          Loading...
                        </>
                      ) : (
                        <>Load more doctors</>
                      )}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Showing {doctors.length} of {pagination.total}
                    </span>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
      </main>
    </div>
  )
}

export default function DoctorsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex flex-1 items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      }
    >
      <DoctorsPageContent />
    </Suspense>
  )
}
