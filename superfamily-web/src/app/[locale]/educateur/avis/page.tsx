"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Star, User, BarChart3 } from "lucide-react"
import { apiGet } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  parent_profiles?: {
    profiles?: {
      first_name: string
      last_name: string
    }
  }
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-6 w-6" : "h-4 w-4"
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < rating ? "fill-[#F9A825] text-[#F9A825]" : "fill-[#E8E4DF] text-[#E8E4DF]"
          )}
        />
      ))}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return "hier"
  if (diffDays < 7) return `il y a ${diffDays}j`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`
  return date.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })
}

export default function AvisPage() {
  // Fetch educator profile to get educator_profile_id
  const { data: educatorRes, isLoading: educatorLoading } = useQuery<any>({
    queryKey: ["educator-profile"],
    queryFn: () => apiGet("/educators/me"),
  })

  const educatorProfileId = educatorRes?.data?.id

  // Fetch reviews
  const { data: reviewsRes, isLoading: reviewsLoading } = useQuery<any>({
    queryKey: ["educator-reviews", educatorProfileId],
    queryFn: () => apiGet(`/reviews/educator/${educatorProfileId}`),
    enabled: !!educatorProfileId,
  })

  const reviews: Review[] = reviewsRes?.data || []
  const isLoading = educatorLoading || reviewsLoading

  // Compute stats
  const totalReviews = reviews.length
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

  // Rating breakdown
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Avis
        </h1>
        <p className="text-sm text-[#8C8279]">
          Consultez les avis et evaluations de vos clients
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Average rating */}
            <Card className="border-[#E8E4DF] bg-white">
              <CardContent className="flex items-center gap-6 pt-4">
                <div className="text-center">
                  <p className="font-heading text-5xl font-bold text-[#1A1A1A]">
                    {totalReviews > 0 ? averageRating.toFixed(1) : "--"}
                  </p>
                  <StarRating rating={Math.round(averageRating)} size="lg" />
                  <p className="mt-1 text-sm text-[#8C8279]">
                    {totalReviews} avis
                  </p>
                </div>
                <Separator orientation="vertical" className="h-24" />
                <div className="flex-1 space-y-2">
                  {ratingBreakdown.map(({ star, count }) => {
                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="w-8 text-right text-sm font-medium text-[#8C8279]">
                          {star}
                        </span>
                        <Star className="h-3.5 w-3.5 fill-[#F9A825] text-[#F9A825]" />
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E8E4DF]">
                          <div
                            className="h-full rounded-full bg-[#F9A825] transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-8 text-sm text-[#8C8279]">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-[#E8E4DF] bg-white">
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF8E1]">
                    <Star className="h-6 w-6 text-[#F9A825]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#8C8279]">Note moyenne</p>
                    <p className="font-heading text-xl font-bold text-[#1A1A1A]">
                      {totalReviews > 0 ? `${averageRating.toFixed(1)} / 5` : "--"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F5EE]">
                    <BarChart3 className="h-6 w-6 text-[#2E7D52]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#8C8279]">Nombre total d&apos;avis</p>
                    <p className="font-heading text-xl font-bold text-[#1A1A1A]">
                      {totalReviews}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E3F0FF]">
                    <Star className="h-6 w-6 text-[#1976D2]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#8C8279]">Avis 5 etoiles</p>
                    <p className="font-heading text-xl font-bold text-[#1A1A1A]">
                      {ratingBreakdown[0].count}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reviews list */}
          <Card className="border-[#E8E4DF] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
                <Star className="h-5 w-5 text-[#2E7D52]" />
                Tous les avis
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
                    <Star className="h-8 w-8 text-[#8C8279]" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
                    Aucun avis
                  </h3>
                  <p className="mt-1 text-sm text-[#8C8279]">
                    Vous n&apos;avez aucun avis pour le moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const parentProfile = review.parent_profiles?.profiles
                    const parentName = parentProfile
                      ? `${parentProfile.first_name || ""} ${parentProfile.last_name || ""}`.trim()
                      : "Parent"

                    return (
                      <div
                        key={review.id}
                        className="rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
                              <User className="h-4 w-4 text-[#2E7D52]" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#1A1A1A]">{parentName}</p>
                              <StarRating rating={review.rating} />
                            </div>
                          </div>
                          <span className="text-xs text-[#8C8279]">
                            {formatRelativeTime(review.created_at)}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="mt-3 text-sm text-[#1A1A1A]">{review.comment}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
