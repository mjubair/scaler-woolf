'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Star } from 'lucide-react'

export default function DoctorReviews() {
  const [doctor, setDoctor] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: docData } = await api.get('/api/doctors/me/profile')
        setDoctor(docData.doctor)
        const { data: reviewData } = await api.get(`/api/reviews/doctor/${docData.doctor.id}`)
        setReviews(reviewData.reviews)
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patient Reviews</h1>
        <p className="text-muted-foreground">See what patients say about you</p>
      </div>

      {/* Rating Summary */}
      {doctor && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{Number(doctor.avgRating).toFixed(1)}</p>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${i < Math.round(Number(doctor.avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{doctor.totalReviews} reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Star className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{review.patientName}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
