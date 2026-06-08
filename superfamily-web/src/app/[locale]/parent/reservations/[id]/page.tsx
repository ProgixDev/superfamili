"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  Star,
  MessageCircle,
  XCircle,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Phone,
  Mail,
} from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending_payment: { label: "En attente de paiement", className: "bg-[#FFF3EE] text-[#C45B3E]", icon: Clock },
  confirmed: { label: "Confirmee", className: "bg-[#E8F5EE] text-[#2E7D52]", icon: CheckCircle },
  in_progress: { label: "En cours", className: "bg-[#E3F0FF] text-[#1976D2]", icon: Clock },
  completed: { label: "Completee", className: "bg-[#E8F5EE] text-[#2E7D52]", icon: CheckCircle },
  cancelled: { label: "Annulee", className: "bg-red-50 text-red-600", icon: XCircle },
  refunded: { label: "Remboursee", className: "bg-gray-100 text-gray-600", icon: CreditCard },
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  const [hovered, setHovered] = React.useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-0.5 transition-colors"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-7 w-7 ${
              star <= (hovered || value)
                ? "fill-[#F9A825] text-[#F9A825]"
                : "text-[#E8E4DF]"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewDialog({
  bookingId,
  onSuccess,
}: {
  bookingId: string
  onSuccess: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [rating, setRating] = React.useState(0)
  const [reviewText, setReviewText] = React.useState("")

  const reviewMutation = useMutation({
    mutationFn: () =>
      apiPost("/reviews", {
        booking_id: bookingId,
        rating,
        review_text: reviewText || undefined,
      }),
    onSuccess: () => {
      toast.success("Avis soumis avec succes. Merci!")
      setOpen(false)
      setRating(0)
      setReviewText("")
      onSuccess()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de la soumission de l'avis")
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        className="flex-1 gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
        onClick={() => setOpen(true)}
      >
        <Star className="h-4 w-4" />
        Laisser un avis
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Laisser un avis</DialogTitle>
          <DialogDescription>
            Partagez votre experience avec cet educateur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Note globale</Label>
            <StarRating value={rating} onChange={setRating} />
            {rating === 0 && (
              <p className="text-xs text-[#8C8279]">
                Cliquez sur une etoile pour noter
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-text">Commentaire (optionnel)</Label>
            <Textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Decrivez votre experience..."
              className="min-h-24 border-[#E8E4DF]"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Annuler
          </DialogClose>
          <Button
            className="gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
            onClick={() => reviewMutation.mutate()}
            disabled={rating === 0 || reviewMutation.isPending}
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star className="h-4 w-4" />
            )}
            {reviewMutation.isPending ? "Envoi..." : "Soumettre l'avis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const bookingId = params.id as string

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["booking", bookingId],
    queryFn: () => apiGet(`/bookings/${bookingId}`),
    enabled: !!bookingId,
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiPatch(`/bookings/${bookingId}/cancel`, {
        cancellation_reason: "Annulation par le parent",
      }),
    onSuccess: () => {
      toast.success("Reservation annulee avec succes")
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
      queryClient.invalidateQueries({ queryKey: ["parent-bookings"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'annulation")
    },
  })

  const booking = data?.data || data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="h-12 w-12 text-red-400" />
        <h2 className="mt-4 font-heading text-xl font-bold text-[#1A1A1A]">
          Reservation introuvable
        </h2>
        <p className="mt-2 text-sm text-[#8C8279]">
          Cette reservation n&apos;existe pas ou vous n&apos;y avez pas acces.
        </p>
        <Link href="/parent/reservations">
          <Button className="mt-6 bg-[#2E7D52] text-white hover:bg-[#256943]">
            Retour aux reservations
          </Button>
        </Link>
      </div>
    )
  }

  const cfg = statusConfig[booking.status] || statusConfig.pending_payment
  const StatusIcon = cfg.icon

  const educator = booking.educator_profiles?.profiles
  const educatorName = educator
    ? `${educator.first_name} ${educator.last_name}`
    : "Educateur"
  const educatorInitials = educator
    ? `${educator.first_name?.[0]}${educator.last_name?.[0]}`
    : "ED"

  const serviceName = booking.services?.name || "Service"
  const startDate = new Date(booking.booking_date_start)
  const endDate = new Date(booking.booking_date_end)

  const dateStr = startDate.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const startTimeStr = startDate.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })
  const endTimeStr = endDate.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })

  const fmt = (cents: number) => (cents / 100).toFixed(2).replace(".", ",")
  const canCancel = ["pending_payment", "confirmed"].includes(booking.status)

  // Check if booking is completed and has no review yet
  const isCompleted = booking.status === "completed"
  const hasReview =
    booking.reviews && (Array.isArray(booking.reviews) ? booking.reviews.length > 0 : !!booking.reviews)
  const canReview = isCompleted && !hasReview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/parent/reservations"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-[#E8E4DF]/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Reservation
          </h1>
          <p className="text-sm text-[#8C8279]">
            {bookingId.slice(0, 8)}...
          </p>
        </div>
        <Badge className={`${cfg.className} gap-1.5 px-3 py-1.5 text-sm`}>
          <StatusIcon className="h-4 w-4" />
          {cfg.label}
        </Badge>
      </div>

      {/* Educator info */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
            <User className="h-5 w-5 text-[#2E7D52]" />
            Educateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F5EE] text-lg font-bold text-[#2E7D52]">
              {educatorInitials}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-[#1A1A1A]">{educatorName}</p>
              <p className="text-sm text-[#8C8279]">{serviceName}</p>
              {educator?.avatar_url && (
                <div className="mt-1 flex items-center gap-1 text-xs text-[#2E7D52]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Profil verifie
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {educator?.phone && (
                <a
                  href={`tel:${educator.phone}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E4DF] hover:bg-[#FAF8F5] transition-colors"
                >
                  <Phone className="h-4 w-4 text-[#8C8279]" />
                </a>
              )}
              {educator?.email && (
                <a
                  href={`mailto:${educator.email}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E4DF] hover:bg-[#FAF8F5] transition-colors"
                >
                  <Mail className="h-4 w-4 text-[#8C8279]" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking details */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
            <Calendar className="h-5 w-5 text-[#2E7D52]" />
            Details de la reservation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-[#8C8279]" />
              <div>
                <p className="text-xs font-medium uppercase text-[#8C8279]">Date</p>
                <p className="font-medium text-[#1A1A1A] capitalize">{dateStr}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-[#8C8279]" />
              <div>
                <p className="text-xs font-medium uppercase text-[#8C8279]">Horaire</p>
                <p className="font-medium text-[#1A1A1A]">
                  {startTimeStr} — {endTimeStr} ({booking.duration_hours}h)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-[#8C8279]" />
              <div>
                <p className="text-xs font-medium uppercase text-[#8C8279]">Lieu</p>
                <p className="font-medium text-[#1A1A1A]">
                  {booking.location_postal_code || "Non specifie"}
                </p>
                {booking.distance_km > 0 && (
                  <p className="text-xs text-[#8C8279]">
                    Distance: {booking.distance_km} km
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="mt-0.5 h-4 w-4 text-[#8C8279]" />
              <div>
                <p className="text-xs font-medium uppercase text-[#8C8279]">Service</p>
                <p className="font-medium text-[#1A1A1A]">{serviceName}</p>
              </div>
            </div>
          </div>
          {booking.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase text-[#8C8279]">Notes</p>
                <p className="mt-1 text-sm text-[#1A1A1A]">{booking.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing breakdown */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
            <CreditCard className="h-5 w-5 text-[#2E7D52]" />
            Tarification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#8C8279]">
              Taux horaire ({fmt(booking.hourly_rate_cents)} $/h x {booking.duration_hours}h)
            </span>
            <span className="font-medium text-[#1A1A1A]">{fmt(booking.subtotal_cents)} $</span>
          </div>
          {booking.mileage_fee_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#8C8279]">
                Frais de deplacement ({booking.distance_km} km)
              </span>
              <span className="font-medium text-[#1A1A1A]">{fmt(booking.mileage_fee_cents)} $</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span className="text-[#1A1A1A]">Total</span>
            <span className="text-[#2E7D52]">{fmt(booking.total_amount_cents)} $</span>
          </div>
          {booking.refund_amount_cents > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Remboursement</span>
              <span>-{fmt(booking.refund_amount_cents)} $</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing review display */}
      {isCompleted && hasReview && (
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
              <Star className="h-5 w-5 text-[#F9A825]" />
              Votre avis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const review = Array.isArray(booking.reviews)
                ? booking.reviews[0]
                : booking.reviews
              if (!review) return null
              return (
                <div className="space-y-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-5 w-5 ${
                          s <= (review.rating || 0)
                            ? "fill-[#F9A825] text-[#F9A825]"
                            : "text-[#E8E4DF]"
                        }`}
                      />
                    ))}
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-[#1A1A1A]">{review.review_text}</p>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href={`/parent/messages?educator=${booking.educator_profile_id}`} className="flex-1">
          <Button variant="outline" className="w-full border-[#E8E4DF] gap-2">
            <MessageCircle className="h-4 w-4" />
            Envoyer un message
          </Button>
        </Link>
        {canCancel && (
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Annuler la reservation
          </Button>
        )}
        {canReview && (
          <ReviewDialog
            bookingId={bookingId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
              queryClient.invalidateQueries({ queryKey: ["parent-bookings"] })
            }}
          />
        )}
      </div>
    </div>
  )
}
