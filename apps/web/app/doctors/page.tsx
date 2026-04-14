'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { Navbar } from '@/components/layout/navbar'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Search, Star, MapPin, GraduationCap } from 'lucide-react'

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

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchDoctors()
  }, [page])

  async function fetchDoctors() {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 12 }
      if (search) params.search = search
      if (specialization) params.specialization = specialization
      const { data } = await api.get('/api/doctors', { params })
      setDoctors(data.doctors)
      setPagination(data.pagination)
    } catch {
      // handle silently
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchDoctors()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Find a Doctor</h1>
          <p className="text-muted-foreground mt-1">Browse and book consultations with verified doctors</p>
        </div>

        {/* Search & Filters */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by doctor name..."
              className="pl-9 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Input
            placeholder="Specialization (e.g., Cardiologist)"
            className="h-10 sm:max-w-[250px]"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
          />
          <Button type="submit" size="lg">Search</Button>
        </form>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No doctors found. Try a different search.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doctor) => (
                <Link key={doctor.id} href={`/doctors/${doctor.id}`}>
                  <Card className="hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer h-full">
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
                        <GraduationCap className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{doctor.qualification}</span>
                      </div>
                      {doctor.hospitalName && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{doctor.hospitalName}</span>
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
                          <span className="text-xs text-muted-foreground block">per consultation</span>
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
      </main>
    </div>
  )
}
