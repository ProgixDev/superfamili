"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  DollarSign,
  Users,
  MessageCircle,
  ArrowRight,
  Bell,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { apiGet } from "@/lib/api/client"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface Booking {
  id: string
  status: string
  booking_date_start: string
  booking_date_end: string
  total_amount_cents: number
  duration_hours: number
  location_postal_code?: string
  educator_profiles?: {
    profiles?: {
      first_name?: string
      last_name?: string
    }
  }
  services?: {
    name?: string
  }
}

interface BookingsResponse {
  data: Booking[]
  meta?: Record<string, unknown>
}

interface Notification {
  id: string
  notification_type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  related_booking_id: string | null
}

interface NotificationsResponse {
  data: Notification[]
  meta?: Record<string, unknown>
}

interface ParentProfile {
  data?: {
    children?: Array<{ id: string; first_name: string; is_active?: boolean }>
  }
  children?: Array<{ id: string; first_name: string; is_active?: boolean }>
}

interface ProfileResponse {
  data?: {
    first_name?: string
    last_name?: string
  }
}

interface Conversation {
  id: string
  parent_unread_count: number
}

const statusStyles: Record<string, string> = {
  confirmed: "bg-[#E8F5EE] text-[#2E7D52]",
  pending_payment: "bg-[#FFF3EE] text-[#C45B3E]",
  in_progress: "bg-[#E3F0FF] text-[#1976D2]",
  completed: "bg-[#E8F5EE] text-[#2E7D52]",
  cancelled: "bg-red-50 text-red-600",
  refunded: "bg-gray-100 text-gray-600",
}

export default function ParentDashboardPage() {
  const t = useTranslations("parentDashboard")
  const tc = useTranslations("common")
  const tb = useTranslations("bookings")
  const tdt = useTranslations("dateTime")

  const statusLabels: Record<string, string> = {
    confirmed: tb("statusConfirmed"),
    pending_payment: tb("statusPending"),
    in_progress: tb("statusInProgress"),
    completed: tb("statusCompleted"),
    cancelled: tb("statusCancelled"),
    refunded: tb("statusRefunded"),
  }

  const dateLocale = tdt("locale")

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return tdt("now")
    if (diffMin < 60) return tdt("minAgo", { min: diffMin })
    if (diffH < 24) return tdt("hAgo", { h: diffH })
    if (diffDays === 1) return tdt("yesterday")
    if (diffDays < 7) return tdt("dAgo", { days: diffDays })
    return date.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })
  }

  // Fetch profile for greeting
  const { data: profileData } = useQuery<ProfileResponse>({
    queryKey: ["profile-me"],
    queryFn: () => apiGet("/profiles/me"),
  })

  // Fetch bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<BookingsResponse>({
    queryKey: ["parent-bookings"],
    queryFn: () => apiGet("/bookings"),
  })

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery<NotificationsResponse>({
    queryKey: ["parent-notifications"],
    queryFn: () => apiGet("/notifications"),
  })

  // Fetch children
  const { data: parentData, isLoading: childrenLoading } = useQuery<ParentProfile>({
    queryKey: ["parent-children"],
    queryFn: () => apiGet("/parents/me"),
  })

  // Fetch conversations for unread message count
  const { data: conversationsData } = useQuery<any>({
    queryKey: ["parent-conversations"],
    queryFn: () => apiGet("/messaging/conversations"),
  })

  const firstName = profileData?.data?.first_name || ""
  const allBookings: Booking[] = bookingsData?.data || []
  const notifications: Notification[] = notificationsData?.data || []
  const children = (parentData?.data?.children || parentData?.children || []).filter(
    (c: any) => c.is_active !== false
  )
  const conversations: Conversation[] = conversationsData?.data || (Array.isArray(conversationsData) ? conversationsData : [])

  // Compute stats
  const now = new Date()
  const upcomingBookings = allBookings.filter((b) => {
    const startDate = new Date(b.booking_date_start)
    return (
      startDate >= now &&
      ["confirmed", "pending_payment", "in_progress"].includes(b.status)
    )
  })

  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthSpending = allBookings
    .filter((b) => {
      const d = new Date(b.booking_date_start)
      return (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        ["confirmed", "in_progress", "completed"].includes(b.status)
      )
    })
    .reduce((sum, b) => sum + (b.total_amount_cents || 0), 0)

  const unreadMessages = conversations.reduce(
    (sum, c) => sum + (c.parent_unread_count || 0),
    0
  )

  // Upcoming bookings sorted by date (next 3)
  const nextBookings = [...upcomingBookings]
    .sort(
      (a, b) =>
        new Date(a.booking_date_start).getTime() -
        new Date(b.booking_date_start).getTime()
    )
    .slice(0, 3)

  // Recent notifications (last 3)
  const recentNotifications = [...notifications]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3)

  const statsLoading = bookingsLoading || notificationsLoading || childrenLoading

  const fmtAmount = (cents: number) =>
    (cents / 100).toFixed(2).replace(".", ",") + " $"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-[#8C8279]">{tc("welcome")}</p>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          {firstName ? tc("hello", { name: firstName }) : t("fallbackHeading")}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={Calendar}
              value={String(upcomingBookings.length)}
              label={t("upcomingBookingsStat")}
              iconBgClass="bg-[#E8F5EE]"
            />
            <StatCard
              icon={DollarSign}
              value={fmtAmount(monthSpending)}
              label={t("monthSpending")}
              iconBgClass="bg-[#FFF3EE]"
            />
            <StatCard
              icon={Users}
              value={String(children.length)}
              label={t("childrenStat")}
              iconBgClass="bg-[#E3F0FF]"
            />
            <StatCard
              icon={MessageCircle}
              value={String(unreadMessages)}
              label={t("unreadMessages")}
              iconBgClass="bg-[#F5F0FF]"
            />
          </>
        )}
      </div>

      {/* Upcoming bookings */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg font-bold text-[#1A1A1A]">
            {t("upcomingBookingsTitle")}
          </CardTitle>
          <Link href="/parent/reservations">
            <Button variant="ghost" size="sm" className="gap-1 text-[#2E7D52]">
              {tc("viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookingsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : nextBookings.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8C8279]">
              {t("noUpcomingBookings")}
            </div>
          ) : (
            nextBookings.map((booking) => {
              const educatorProfile = booking.educator_profiles?.profiles
              const educatorName = educatorProfile
                ? `${educatorProfile.first_name || ""} ${educatorProfile.last_name || ""}`.trim()
                : t("educatorFallback")
              const serviceName = booking.services?.name || t("serviceFallback")
              const startDate = new Date(booking.booking_date_start)
              const endDate = new Date(booking.booking_date_end)
              const dateStr = startDate.toLocaleDateString(dateLocale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
              const startTimeStr = startDate.toLocaleTimeString(dateLocale, {
                hour: "2-digit",
                minute: "2-digit",
              })
              const endTimeStr = endDate.toLocaleTimeString(dateLocale, {
                hour: "2-digit",
                minute: "2-digit",
              })

              return (
                <Link
                  key={booking.id}
                  href={`/parent/reservations/${booking.id}`}
                  className="flex items-center gap-4 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
                    {educatorProfile ? (
                      <span className="text-xs font-bold text-[#2E7D52]">
                        {educatorProfile.first_name?.[0]}
                        {educatorProfile.last_name?.[0]}
                      </span>
                    ) : (
                      <Users className="h-5 w-5 text-[#2E7D52]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1A1A1A]">
                      {educatorName}
                    </p>
                    <p className="text-sm text-[#8C8279]">
                      <span className="capitalize">{dateStr}</span>
                      {" "}
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="inline h-3 w-3" />
                        {startTimeStr} - {endTimeStr}
                      </span>
                      {" "}
                      {serviceName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusStyles[booking.status] || "bg-gray-100 text-gray-600"}>
                      {statusLabels[booking.status] || booking.status}
                    </Badge>
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {fmtAmount(booking.total_amount_cents)}
                    </span>
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Recent notifications */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg font-bold text-[#1A1A1A]">
            {t("recentNotifications")}
          </CardTitle>
          <Link href="/parent/notifications">
            <Button variant="ghost" size="sm" className="gap-1 text-[#2E7D52]">
              {tc("viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))
          ) : recentNotifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8C8279]">
              {t("noNotifications")}
            </div>
          ) : (
            recentNotifications.map((notif) => (
              <Link
                key={notif.id}
                href={
                  notif.related_booking_id
                    ? `/parent/reservations/${notif.related_booking_id}`
                    : "/parent/notifications"
                }
                className={`flex items-start gap-3 rounded-xl border border-[#E8E4DF] p-4 transition-colors hover:bg-[#FAF8F5] ${
                  notif.is_read ? "bg-white" : "bg-[#E8F5EE]/40"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5]">
                  <Bell className="h-4 w-4 text-[#8C8279]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm text-[#1A1A1A] ${notif.is_read ? "font-medium" : "font-bold"}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#2E7D52]" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[#8C8279] line-clamp-1">
                    {notif.message}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[#8C8279]">
                  {formatRelativeTime(notif.created_at)}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
