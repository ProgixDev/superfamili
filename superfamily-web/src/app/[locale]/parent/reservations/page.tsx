"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Calendar, Plus, Users, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { apiGet } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

function BookingCard({ booking }: { booking: any }) {
  const t = useTranslations("bookings")
  const tp = useTranslations("parentDashboard")
  const tdt = useTranslations("dateTime")
  const dateLocale = tdt("locale")

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending_payment: { label: t("statusPending"), className: "bg-[#FFF3EE] text-[#C45B3E]" },
    confirmed: { label: t("statusConfirmed"), className: "bg-[#E8F5EE] text-[#2E7D52]" },
    in_progress: { label: t("statusInProgress"), className: "bg-[#E3F0FF] text-[#1976D2]" },
    completed: { label: t("statusCompleted"), className: "bg-[#E3F0FF] text-[#1976D2]" },
    cancelled: { label: t("statusCancelled"), className: "bg-red-50 text-red-600" },
    refunded: { label: t("statusRefunded"), className: "bg-gray-100 text-gray-600" },
  }

  const cfg = statusConfig[booking.status] || statusConfig.pending_payment
  const educatorProfile = booking.educator_profiles?.profiles
  const educatorName = educatorProfile
    ? `${educatorProfile.first_name} ${educatorProfile.last_name}`
    : tp("educatorFallback")
  const serviceName = booking.services?.name || tp("serviceFallback")
  const startDate = new Date(booking.booking_date_start)
  const endDate = new Date(booking.booking_date_end)

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
  const totalStr = (booking.total_amount_cents / 100)
    .toFixed(2)
    .replace(".", ",")

  return (
    <Link
      href={`/parent/reservations/${booking.id}`}
      className="flex items-center gap-4 rounded-xl border border-[#E8E4DF] bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
        {educatorProfile ? (
          <span className="text-sm font-bold text-[#2E7D52]">
            {educatorProfile.first_name?.[0]}
            {educatorProfile.last_name?.[0]}
          </span>
        ) : (
          <Users className="h-5 w-5 text-[#2E7D52]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[#1A1A1A]">{educatorName}</p>
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
        <p className="font-heading text-lg font-bold text-[#1A1A1A]">
          {totalStr} $
        </p>
      </div>
    </Link>
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
      <Link href="/parent/reservations/nouvelle">
        <Button className="mt-6 bg-[#2E7D52] text-white hover:bg-[#256943]">
          <Plus className="mr-2 h-4 w-4" />
          {t("newBooking")}
        </Button>
      </Link>
    </div>
  )
}

export default function ReservationsPage() {
  const t = useTranslations("bookings")
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["parent-bookings"],
    queryFn: () => apiGet("/bookings"),
  })

  const allBookings: any[] = data?.data || data || []

  const filterBookings = (statuses?: string[]) => {
    if (!statuses) return allBookings
    return allBookings.filter((b: any) => statuses.includes(b.status))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {t("reservations")}
          </h1>
          <p className="text-sm text-[#8C8279]">
            {t("manageBookings")}
          </p>
        </div>
        <Link href="/parent/reservations/nouvelle">
          <Button className="bg-[#2E7D52] text-white hover:bg-[#256943]">
            <Plus className="mr-2 h-4 w-4" />
            {t("newBooking")}
          </Button>
        </Link>
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
            {t("cancelled")} ({filterBookings(["cancelled", "refunded"]).length})
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
              {allBookings.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="mt-4 space-y-3">
                  {allBookings.map((b: any) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="upcoming">
              {filterBookings(["confirmed", "pending_payment", "in_progress"]).length === 0 ? (
                <EmptyState />
              ) : (
                <div className="mt-4 space-y-3">
                  {filterBookings(["confirmed", "pending_payment", "in_progress"]).map((b: any) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="completed">
              {filterBookings(["completed"]).length === 0 ? (
                <EmptyState />
              ) : (
                <div className="mt-4 space-y-3">
                  {filterBookings(["completed"]).map((b: any) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="cancelled">
              {filterBookings(["cancelled", "refunded"]).length === 0 ? (
                <EmptyState />
              ) : (
                <div className="mt-4 space-y-3">
                  {filterBookings(["cancelled", "refunded"]).map((b: any) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
