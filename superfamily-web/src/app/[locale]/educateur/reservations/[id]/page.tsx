"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Mail,
  Star,
} from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending_payment: { label: "En attente de paiement", className: "bg-[#FFF3EE] text-[#C45B3E]", icon: Clock },
  confirmed: { label: "Confirmee", className: "bg-[#E8F5EE] text-[#2E7D52]", icon: CheckCircle },
  in_progress: { label: "En cours", className: "bg-[#E3F0FF] text-[#1976D2]", icon: Clock },
  completed: { label: "Completee", className: "bg-[#E8F5EE] text-[#2E7D52]", icon: CheckCircle },
  cancelled: { label: "Annulee", className: "bg-red-50 text-red-600", icon: XCircle },
  refunded: { label: "Remboursee", className: "bg-gray-100 text-gray-600", icon: CreditCard },
}

export default function EducatorBookingDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const bookingId = params.id as string

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["booking", bookingId],
    queryFn: () => apiGet(`/bookings/${bookingId}`),
    enabled: !!bookingId,
  })

  const completeMutation = useMutation({
    mutationFn: () => apiPatch(`/bookings/${bookingId}/complete`),
    onSuccess: () => {
      toast.success("Reservation marquee comme completee")
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  })

  const cancelMutation = useMutation({
    mutationFn: () => apiPatch(`/bookings/${bookingId}/cancel`, { cancellation_reason: "Annulation par l'educateur" }),
    onSuccess: () => {
      toast.success("Reservation annulee")
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
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
        <h2 className="mt-4 font-heading text-xl font-bold text-[#1A1A1A]">Reservation introuvable</h2>
        <Link href="/educateur/reservations">
          <Button className="mt-6 bg-[#2E7D52] text-white hover:bg-[#256943]">Retour aux reservations</Button>
        </Link>
      </div>
    )
  }

  const cfg = statusConfig[booking.status] || statusConfig.pending_payment
  const StatusIcon = cfg.icon

  const parent = booking.parent_profiles?.profiles
  const parentName = parent ? `${parent.first_name} ${parent.last_name}` : "Parent"
  const parentInitials = parent ? `${parent.first_name?.[0]}${parent.last_name?.[0]}` : "PA"
  const serviceName = booking.services?.name || "Service"
  const startDate = new Date(booking.booking_date_start)
  const endDate = new Date(booking.booking_date_end)

  const dateStr = startDate.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const startTimeStr = startDate.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })
  const endTimeStr = endDate.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })
  const fmt = (cents: number) => (cents / 100).toFixed(2).replace(".", ",")

  const canComplete = ["confirmed", "in_progress"].includes(booking.status)
  const canCancel = ["confirmed"].includes(booking.status)

  // Review if exists
  const review = booking.reviews
    ? Array.isArray(booking.reviews) ? booking.reviews[0] : booking.reviews
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/educateur/reservations" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-[#E8E4DF]/50 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">Reservation</h1>
          <p className="text-sm text-[#8C8279]">{bookingId.slice(0, 8)}...</p>
        </div>
        <Badge className={`${cfg.className} gap-1.5 px-3 py-1.5 text-sm`}>
          <StatusIcon className="h-4 w-4" />
          {cfg.label}
        </Badge>
      </div>

      {/* Parent info */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
            <User className="h-5 w-5 text-[#2E7D52]" />
            Parent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F5EE] text-lg font-bold text-[#2E7D52]">
              {parentInitials}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-[#1A1A1A]">{parentName}</p>
              <p className="text-sm text-[#8C8279]">{serviceName}</p>
            </div>
            <div className="flex gap-2">
              {parent?.phone && (
                <a href={`tel:${parent.phone}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E4DF] hover:bg-[#FAF8F5] transition-colors">
                  <Phone className="h-4 w-4 text-[#8C8279]" />
                </a>
              )}
              {parent?.email && (
                <a href={`mailto:${parent.email}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E4DF] hover:bg-[#FAF8F5] transition-colors">
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
            Details
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
                <p className="font-medium text-[#1A1A1A]">{startTimeStr} — {endTimeStr} ({booking.duration_hours}h)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-[#8C8279]" />
              <div>
                <p className="text-xs font-medium uppercase text-[#8C8279]">Lieu</p>
                <p className="font-medium text-[#1A1A1A]">{booking.location_postal_code || "Non specifie"}</p>
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
                <p className="text-xs font-medium uppercase text-[#8C8279]">Notes du parent</p>
                <p className="mt-1 text-sm text-[#1A1A1A]">{booking.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Earnings */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
            <CreditCard className="h-5 w-5 text-[#2E7D52]" />
            Vos revenus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#8C8279]">Sous-total</span>
            <span className="font-medium text-[#1A1A1A]">{fmt(booking.subtotal_cents)} $</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8C8279]">Commission plateforme (30%)</span>
            <span className="font-medium text-red-500">-{fmt(booking.platform_commission_cents)} $</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span className="text-[#1A1A1A]">Vos gains</span>
            <span className="text-[#2E7D52]">{fmt(booking.educator_earnings_cents)} $</span>
          </div>
        </CardContent>
      </Card>

      {/* Review */}
      {review && (
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
              <Star className="h-5 w-5 text-[#F9A825]" />
              Avis du parent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-5 w-5 ${s <= (review.rating || 0) ? "fill-[#F9A825] text-[#F9A825]" : "text-[#E8E4DF]"}`} />
              ))}
            </div>
            {review.review_text && <p className="text-sm text-[#1A1A1A]">{review.review_text}</p>}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href={`/educateur/messages?parent=${booking.parent_profile_id}`} className="flex-1">
          <Button variant="outline" className="w-full border-[#E8E4DF] gap-2">
            <Mail className="h-4 w-4" />
            Contacter le parent
          </Button>
        </Link>
        {canComplete && (
          <Button
            className="flex-1 gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Marquer completee
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Annuler
          </Button>
        )}
      </div>
    </div>
  )
}
