"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " $"
}

function BookingCard({
  booking,
  onComplete,
  onCancel,
  isCompletePending,
  isCancelPending,
}: {
  booking: any
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  isCompletePending: boolean
  isCancelPending: boolean
}) {
  const t = useTranslations("bookings")
  const tc = useTranslations("common")
  const tdt = useTranslations("dateTime")
  const dateLocale = tdt("locale")

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending_payment: { label: t("statusPending"), className: "bg-[#FFF3EE] text-[#C45B3E]" },
    confirmed: { label: t("statusConfirmed"), className: "bg-[#E8F5EE] text-[#2E7D52]" },
    in_progress: { label: t("statusInProgress"), className: "bg-[#E3F0FF] text-[#1976D2]" },
    completed: { label: t("statusCompleted"), className: "bg-[#E3F0FF] text-[#1976D2]" },
    cancelled: { label: t("statusCancelled"), className: "bg-red-50 text-red-600" },
  }

  const cfg = statusConfig[booking.status] || statusConfig.pending_payment
  const parentProfile = booking.parent_profiles?.profiles
  const parentName = parentProfile
    ? `${parentProfile.first_name || ""} ${parentProfile.last_name || ""}`.trim()
    : tc("parent")
  const serviceName = booking.services?.name || "Service"
  const startDate = new Date(booking.booking_date_start || booking.start_time)
  const endDate = new Date(booking.booking_date_end || booking.end_time)

  const dateStr = startDate.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const startTimeStr = startDate.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })
  const endTimeStr = endDate.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })
  const earningsStr = formatAmount(booking.educator_earnings_cents || 0)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E8E4DF] bg-white p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center">
      <Link
        href={`/educateur/reservations/${booking.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
          {parentProfile ? (
            <span className="text-sm font-bold text-[#2E7D52]">
              {parentProfile.first_name?.[0]}
              {parentProfile.last_name?.[0]}
            </span>
          ) : (
            <Users className="h-5 w-5 text-[#2E7D52]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#1A1A1A]">{parentName}</p>
            <Badge className={cfg.className}>{cfg.label}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#8C8279]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {startTimeStr} - {endTimeStr}
            </span>
            <span>{serviceName}</span>
            {booking.location_postal_code && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {booking.location_postal_code}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-heading text-lg font-bold text-[#1A1A1A]">{earningsStr}</p>
        </div>
      </Link>

      {booking.status === "confirmed" && (
        <div className="flex shrink-0 gap-2 sm:flex-col">
          <Button
            size="sm"
            className="gap-1 bg-[#2E7D52] text-white hover:bg-[#256943]"
            onClick={(e) => {
              e.preventDefault()
              onComplete(booking.id)
            }}
            disabled={isCompletePending}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {t("markCompleted")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-[#E8E4DF] text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.preventDefault()
              onCancel(booking.id)
            }}
            disabled={isCancelPending}
          >
            <XCircle className="h-3.5 w-3.5" />
            {t("cancelBooking")}
          </Button>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const t = useTranslations("bookings")
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
        <Calendar className="h-8 w-8 text-[#8C8279]" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
        {t("noBooking")}
      </h3>
      <p className="mt-1 text-sm text-[#8C8279]">
        {t("noBookingInCategory")}
      </p>
    </div>
  )
}

export default function EducateurReservationsPage() {
  const t = useTranslations("bookings")
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["educator-bookings"],
    queryFn: () => apiGet("/bookings"),
  })

  const allBookings: any[] = data?.data || []

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/bookings/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educator-bookings"] })
      toast.success(t("bookingCompleted"))
    },
    onError: () => {
      toast.error(t("bookingCompletedError"))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/bookings/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educator-bookings"] })
      toast.success(t("bookingCancelled"))
    },
    onError: () => {
      toast.error(t("bookingCancelledError"))
    },
  })

  const filterBookings = (statuses?: string[]) => {
    if (!statuses) return allBookings
    return allBookings.filter((b: any) => statuses.includes(b.status))
  }

  const renderBookingList = (bookings: any[]) =>
    bookings.length === 0 ? (
      <EmptyState />
    ) : (
      <div className="mt-4 space-y-3">
        {bookings.map((b: any) => (
          <BookingCard
            key={b.id}
            booking={b}
            onComplete={(id) => completeMutation.mutate(id)}
            onCancel={(id) => cancelMutation.mutate(id)}
            isCompletePending={completeMutation.isPending}
            isCancelPending={cancelMutation.isPending}
          />
        ))}
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          {t("reservations")}
        </h1>
        <p className="text-sm text-[#8C8279]">
          {t("manageBookingsEducator")}
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t("all")} ({allBookings.length})</TabsTrigger>
          <TabsTrigger value="upcoming">
            {t("upcoming")} ({filterBookings(["confirmed", "pending_payment", "in_progress"]).length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t("completed")} ({filterBookings(["completed"]).length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t("cancelled")} ({filterBookings(["cancelled"]).length})
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl bg-red-50 p-6 text-center text-sm text-red-600">
            {t("loadError")}
          </div>
        ) : (
          <>
            <TabsContent value="all">
              {renderBookingList(allBookings)}
            </TabsContent>
            <TabsContent value="upcoming">
              {renderBookingList(filterBookings(["confirmed", "pending_payment", "in_progress"]))}
            </TabsContent>
            <TabsContent value="completed">
              {renderBookingList(filterBookings(["completed"]))}
            </TabsContent>
            <TabsContent value="cancelled">
              {renderBookingList(filterBookings(["cancelled"]))}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
