'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { Navbar } from '@/components/layout/navbar'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Star, MapPin, GraduationCap, Clock, Calendar } from 'lucide-react'

interface Doctor {
  id: number
  specialization: string
  qualification: string
  experience: number
  consultationFee: string
  bio: string | null
  hospitalName: string | null
  address: string | null
  avgRating: string
  totalReviews: number
  userName: string
  userEmail: string
  userAvatar: string | null
  userPhone: string | null
}

interface Review {
  id: number
  rating: number
  comment: string | null
  createdAt: string
  patientName: string
}

export default function DoctorProfilePage() {
  const params = useParams()
  const doctorId = params.id as string
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [doctorRes, reviewsRes] = await Promise.all([
          api.get(`/api/doctors/${doctorId}`),
          api.get(`/api/reviews/doctor/${doctorId}`),
        ])
        setDoctor(doctorRes.data.doctor)
        setReviews(reviewsRes.data.reviews)
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [doctorId])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-lg text-muted-foreground">Doctor not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8">
        {/* Doctor Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl shrink-0">
                {doctor.userName.charAt(0)}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl font-bold">{doctor.userName}</h1>
                  <p className="text-primary font-medium">{doctor.specialization}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="size-4" />
                    {doctor.qualification}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" />
                    {doctor.experience} years experience
                  </span>
                  {doctor.hospitalName && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-4" />
                      {doctor.hospitalName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="size-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{Number(doctor.avgRating).toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({doctor.totalReviews} reviews)</span>
                  </div>
                  <div className="text-lg font-bold">Rs. {doctor.consultationFee}</div>
                </div>
              </div>
              <div className="sm:self-start">
                <Link href={`/booking/${doctor.id}`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    <Calendar className="size-4 mr-2" />
                    Book Consultation
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {doctor.bio && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{doctor.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Address */}
        {doctor.address && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{doctor.address}</p>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Reviews ({doctor.totalReviews})</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{review.patientName}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
