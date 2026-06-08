"use client"

import { useQuery } from "@tanstack/react-query"
import {
  DollarSign,
  Calendar,
  Star,
  CheckCircle,
  ArrowRight,
  Users,
  CreditCard,
  TrendingUp,
  Bell,
  ShieldCheck,
  Clock as ClockIcon,
  ShieldAlert,
  ShieldX,
  Camera,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { apiGet } from "@/lib/api/client"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

interface Profile {
  data: {
    role: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

type LicenseStatus = "none" | "pending" | "approved" | "rejected"

type KycStatus =
  | "not_started"
  | "in_progress"
  | "approved"
  | "declined"
  | "expired"
  | "review_required"

// Possible values mirror what payments.service writes back: 'pending'
// (Stripe account exists but onboarding isn't complete), 'active'
// (charges_enabled), or null (no Stripe account at all).
type StripeAccountStatus = "pending" | "active" | null

interface EducatorProfile {
  data: {
    average_rating: number | null
    total_reviews: number
    completion_rate: number | null
    license_status?: LicenseStatus
    license_rejection_reason?: string | null
    kyc_status?: KycStatus
    stripe_account_id?: string | null
    stripe_account_status?: StripeAccountStatus
    educator_services: Array<{
      id: string
      service: { name: string }
      hourly_rate_cents: number
    }>
  }
}

interface Booking {
  id: string
  status: string
  start_time: string
  end_time: string
  educator_earnings_cents: number
  family?: {
    first_name: string
    last_name: string
  }
  children_count?: number
}

interface BookingsResponse {
  data: Booking[]
}

interface Payout {
  id: string
  amount_cents: number
  status: string
  created_at: string
  arrival_date?: string
}

interface PayoutsResponse {
  data: Payout[]
}

interface NotificationsResponse {
  data: Array<{ id: string; read: boolean }>
}

type EducatorDocumentStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "expired"

type RequiredDocumentType =
  | "background_check"
  | "birth_certificate"
  | "cpr_certification"
  | "work_authorization"

interface EducatorDocument {
  id: string
  document_type: RequiredDocumentType | "secondary_id" | "diploma"
  status: EducatorDocumentStatus
}

interface DocumentsResponse {
  data: EducatorDocument[]
}

const REQUIRED_DOCUMENT_TYPES: RequiredDocumentType[] = [
  "background_check",
  "birth_certificate",
  "cpr_certification",
  "work_authorization",
]

/**
 * Quebec license tier badge shown in the educator dashboard header.
 *
 * Acts as both an indicator and a call-to-action: if the license is missing
 * or rejected, the whole row becomes a link to the upload page so the
 * educator can re-submit in one click.
 */
function LicenseBadge({
  status,
  rejectionReason,
}: {
  status: LicenseStatus
  rejectionReason?: string | null
}) {
  const t = useTranslations("license")

  const config: Record<
    LicenseStatus,
    {
      icon: typeof ShieldCheck
      dot: string
      text: string
      bg: string
      border: string
      label: string
      actionable: boolean
    }
  > = {
    approved: {
      icon: ShieldCheck,
      dot: "🟢",
      text: "text-[#1B5E38]",
      bg: "bg-[#E8F5EE]",
      border: "border-[#2E7D52]/30",
      label: t("statusApproved"),
      actionable: false,
    },
    pending: {
      icon: ClockIcon,
      dot: "🟡",
      text: "text-[#92400E]",
      bg: "bg-[#FFFBEB]",
      border: "border-[#F59E0B]/30",
      label: t("statusPending"),
      actionable: false,
    },
    rejected: {
      icon: ShieldX,
      dot: "🔴",
      text: "text-red-800",
      bg: "bg-red-50",
      border: "border-red-200",
      label: t("statusRejected"),
      actionable: true,
    },
    none: {
      icon: ShieldAlert,
      dot: "⚪",
      text: "text-[#8C8279]",
      bg: "bg-[#FAF8F5]",
      border: "border-[#E8E4DF]",
      label: t("statusNone"),
      actionable: true,
    },
  }

  const cfg = config[status]
  const Icon = cfg.icon

  const body = (
    <div
      className={`flex items-start gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3`}
      aria-label={t("badgeAria")}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.text}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${cfg.text}`}>
          <span className="mr-1" aria-hidden>
            {cfg.dot}
          </span>
          {cfg.label}
        </p>
        {status === "rejected" && rejectionReason && (
          <p className="mt-1 text-xs text-red-700">
            {t("statusRejectedReason", { reason: rejectionReason })}
          </p>
        )}
      </div>
      {cfg.actionable && (
        <span className={`shrink-0 text-sm font-medium ${cfg.text} underline-offset-2 group-hover:underline`}>
          {status === "rejected" ? t("actionReplace") : t("actionUpload")}
        </span>
      )}
    </div>
  )

  if (cfg.actionable) {
    return (
      <Link
        href="/educateur/inscription/licence"
        className="group block"
      >
        {body}
      </Link>
    )
  }
  return body
}

/**
 * KYC (Didit identity verification) badge — mirror of LicenseBadge.
 *
 * Drives the Didit flow entry point: the whole row is a link to the
 * verification page when the status is `not_started`, `declined`, or
 * `expired`. For `in_progress`, `approved`, `review_required` it's
 * a static indicator.
 */
function KycBadge({ status }: { status: KycStatus }) {
  const t = useTranslations("kyc")

  const config: Record<
    KycStatus,
    {
      icon: typeof ShieldCheck
      dot: string
      text: string
      bg: string
      border: string
      label: string
      actionable: boolean
      action?: string
    }
  > = {
    approved: {
      icon: ShieldCheck,
      dot: "🟢",
      text: "text-[#1B5E38]",
      bg: "bg-[#E8F5EE]",
      border: "border-[#2E7D52]/30",
      label: t("badgeApproved"),
      actionable: false,
    },
    in_progress: {
      icon: ClockIcon,
      dot: "🟡",
      text: "text-[#92400E]",
      bg: "bg-[#FFFBEB]",
      border: "border-[#F59E0B]/30",
      label: t("badgeInProgress"),
      actionable: false,
    },
    review_required: {
      icon: ClockIcon,
      dot: "🟡",
      text: "text-[#92400E]",
      bg: "bg-[#FFFBEB]",
      border: "border-[#F59E0B]/30",
      label: t("badgeReview"),
      actionable: false,
    },
    declined: {
      icon: ShieldX,
      dot: "🔴",
      text: "text-red-800",
      bg: "bg-red-50",
      border: "border-red-200",
      label: t("badgeDeclined"),
      actionable: true,
      action: t("badgeActionRetry"),
    },
    expired: {
      icon: ShieldX,
      dot: "🔴",
      text: "text-red-800",
      bg: "bg-red-50",
      border: "border-red-200",
      label: t("badgeExpired"),
      actionable: true,
      action: t("badgeActionRetry"),
    },
    not_started: {
      icon: ShieldAlert,
      dot: "⚪",
      text: "text-[#8C8279]",
      bg: "bg-[#FAF8F5]",
      border: "border-[#E8E4DF]",
      label: t("badgeNotStarted"),
      actionable: true,
      action: t("badgeActionStart"),
    },
  }

  const cfg = config[status]
  const Icon = cfg.icon

  const body = (
    <div
      className={`flex items-start gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3`}
      aria-label={t("title")}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.text}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${cfg.text}`}>
          <span className="mr-1" aria-hidden>
            {cfg.dot}
          </span>
          {cfg.label}
        </p>
      </div>
      {cfg.actionable && cfg.action && (
        <span
          className={`shrink-0 text-sm font-medium ${cfg.text} underline-offset-2 group-hover:underline`}
        >
          {cfg.action}
        </span>
      )}
    </div>
  )

  if (cfg.actionable) {
    return (
      <Link
        href="/educateur/inscription/verification"
        className="group block"
      >
        {body}
      </Link>
    )
  }
  return body
}

function ProfilePhotoPrompt() {
  const t = useTranslations("educatorDashboard")

  return (
    <Link href="/educateur/profil" className="group block">
      <div className="flex items-start gap-3 rounded-xl border border-[#C45B3E]/30 bg-[#FFF3EE] px-4 py-3">
        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-[#C45B3E]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#8A3F2B]">
            {t("profilePhotoPromptTitle")}
          </p>
          <p className="mt-1 text-xs text-[#8A3F2B]/80">
            {t("profilePhotoPromptBody")}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-[#8A3F2B] underline-offset-2 group-hover:underline">
          {t("profilePhotoPromptAction")}
        </span>
      </div>
    </Link>
  )
}

function RequiredDocumentsPrompt({ missingCount }: { missingCount: number }) {
  const t = useTranslations("educatorDashboard")

  if (missingCount <= 0) return null

  return (
    <Link href="/educateur/documents" className="group block">
      <div className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] px-4 py-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#92400E]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#92400E]">
            {t("documentsPromptTitle", { count: missingCount })}
          </p>
          <p className="mt-1 text-xs text-[#92400E]/80">
            {t("documentsPromptBody")}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-[#92400E] underline-offset-2 group-hover:underline">
          {t("documentsPromptAction")}
        </span>
      </div>
    </Link>
  )
}

/**
 * Banner that appears when the educator hasn't connected (or finished
 * connecting) their Stripe account. Until `stripe_account_status` is
 * 'active' on the backend, the educator is hidden from parent search
 * and parents can't pay them — this prompt is the educator's nudge to
 * fix that. Clicking goes straight to /educateur/revenus where the
 * "Connect Stripe" button lives.
 */
function StripeConnectPrompt({
  status,
}: {
  status: StripeAccountStatus | undefined
}) {
  const t = useTranslations("educatorDashboard")

  if (status === "active") return null

  // Two flavours: "you haven't started" and "you started but didn't finish".
  const hasStarted = status === "pending"
  const titleKey = hasStarted
    ? "stripePromptTitleResume"
    : "stripePromptTitleStart"
  const bodyKey = hasStarted
    ? "stripePromptBodyResume"
    : "stripePromptBodyStart"

  return (
    <Link href="/educateur/revenus" className="group block">
      <div className="flex items-start gap-3 rounded-xl border border-[#C45B3E]/30 bg-[#FFF3EE] px-4 py-3">
        <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-[#C45B3E]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#8A3F2B]">
            {t(titleKey)}
          </p>
          <p className="mt-1 text-xs text-[#8A3F2B]/80">{t(bodyKey)}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-[#8A3F2B] underline-offset-2 group-hover:underline">
          {t("stripePromptAction")}
        </span>
      </div>
    </Link>
  )
}

export default function EducatorDashboardPage() {
  const t = useTranslations("educatorDashboard")
  const tc = useTranslations("common")
  const tdt = useTranslations("dateTime")
  const dateLocale = tdt("locale")

  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile-me"],
    queryFn: () => apiGet("/profiles/me"),
  })

  const { data: educatorProfile } = useQuery<EducatorProfile>({
    queryKey: ["educator-profile"],
    queryFn: () => apiGet("/educators/me"),
  })

  const { data: bookingsRes, isLoading: bookingsLoading } = useQuery<BookingsResponse>({
    queryKey: ["educator-bookings"],
    queryFn: () => apiGet("/bookings"),
  })

  const { data: payoutsRes } = useQuery<PayoutsResponse>({
    queryKey: ["educator-payouts"],
    queryFn: () => apiGet("/payments/payouts"),
  })

  const { data: notificationsRes } = useQuery<NotificationsResponse>({
    queryKey: ["educator-notifications"],
    queryFn: () => apiGet("/notifications"),
  })

  const { data: documentsRes } = useQuery<DocumentsResponse>({
    queryKey: ["documents", "me"],
    queryFn: () => apiGet("/documents/me"),
  })

  const firstName = profile?.data?.first_name ?? ""
  const bookings = bookingsRes?.data ?? []
  const payouts = payoutsRes?.data ?? []
  const educator = educatorProfile?.data

  // Compute stats from real data
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.start_time) > now && (b.status === "confirmed" || b.status === "pending")
  )

  const completedThisMonth = bookings.filter(
    (b) =>
      b.status === "completed" &&
      new Date(b.start_time) >= startOfMonth &&
      new Date(b.start_time) <= now
  )

  const revenueThisMonth = completedThisMonth.reduce(
    (sum, b) => sum + (b.educator_earnings_cents ?? 0),
    0
  )

  const totalCompleted = bookings.filter((b) => b.status === "completed").length
  const totalBookings = bookings.length
  const completionRate = totalBookings > 0 ? Math.round((totalCompleted / totalBookings) * 100) : 0

  const averageRating = educator?.average_rating ?? 0
  const unreadCount =
    notificationsRes?.data?.filter((n) => !n.read).length ?? 0

  // Next 3 upcoming bookings
  const nextBookings = upcomingBookings
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3)

  // Payout info
  const pendingPayouts = payouts.filter((p) => p.status === "pending" || p.status === "in_transit")
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount_cents, 0)
  const lastCompletedPayout = payouts.find((p) => p.status === "paid" || p.status === "completed")
  const nextPendingPayout = pendingPayouts[0]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getHours = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return Math.round(diff / (1000 * 60 * 60))
  }

  const statsLoading = bookingsLoading

  const licenseStatus: LicenseStatus = educator?.license_status ?? "none"
  const licenseRejectionReason = educator?.license_rejection_reason
  const kycStatus: KycStatus = educator?.kyc_status ?? "not_started"
  const stripeStatus: StripeAccountStatus = educator?.stripe_account_status ?? null
  // "Fully verified" now requires Stripe Connect to be active too —
  // an educator without a working payout account can't actually be
  // booked (parent search hides them and PaymentIntent creation
  // refuses), so they shouldn't display the green "Vérifié" badge.
  const fullyVerified =
    kycStatus === "approved" &&
    licenseStatus === "approved" &&
    stripeStatus === "active"
  const needsProfilePhoto = profile?.data && !profile.data.avatar_url
  const approvedRequiredDocuments = new Set(
    (documentsRes?.data ?? [])
      .filter((document) => document.status === "approved")
      .map((document) => document.document_type),
  )
  const missingRequiredDocuments = documentsRes
    ? REQUIRED_DOCUMENT_TYPES.filter(
        (type) => !approvedRequiredDocuments.has(type),
      ).length
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#8C8279]">{tc("welcome")}</p>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
              {firstName
                ? tc("hello", { name: firstName })
                : t("fallbackHeading")}
            </h1>
            {fullyVerified && (
              // Compact "Verified" pill — replaces the two large green
              // status cards once both KYC and license are approved.
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2.5 py-1 text-xs font-semibold text-[#1B5E38] ring-1 ring-[#2E7D52]/30"
                aria-label={t("verifiedBadge")}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("verifiedBadge")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/educateur/notifications" className="relative">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5 text-[#8C8279]" />
            </Button>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#C45B3E] text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link href="/educateur/disponibilites">
            <Button className="bg-[#2E7D52] text-white hover:bg-[#256943]">
              <Calendar className="mr-2 h-4 w-4" />
              {t("addAvailability")}
            </Button>
          </Link>
        </div>
      </div>

      {/* KYC + license status cards. Hidden once the educator is fully
          verified (both approved) — the inline "Verified" pill next to
          the name carries that signal instead. The cards stay while
          either piece is incomplete or rejected, since they double as
          actionable links to fix the issue. */}
      {!fullyVerified && (
        <>
          {/* KYC (Didit identity verification) badge. Clickable when the
              educator hasn't started, was declined, or the session expired. */}
          <div data-tour="kyc-step">
            <KycBadge status={kycStatus} />
          </div>
        </>
      )}

      {needsProfilePhoto && <ProfilePhotoPrompt />}

      {/* Stripe Connect onboarding nudge. Stays visible (in red/orange)
          until charges are enabled on the educator's Stripe account.
          Without this, the educator is silently hidden from parent
          search and any attempt to book them errors out at payment. */}
      <StripeConnectPrompt status={stripeStatus} />

      <RequiredDocumentsPrompt missingCount={missingRequiredDocuments} />

      {!fullyVerified && (
        // License tier badge (Quebec childcare law). Clickable when status
        // is `none` or `rejected` — takes the educator straight to the
        // upload page.
        <LicenseBadge
          status={licenseStatus}
          rejectionReason={licenseRejectionReason}
        />
      )}

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
              value={formatCurrency(revenueThisMonth / 100)}
              label={t("monthRevenue")}
              iconBgClass="bg-[#FFF3EE]"
            />
            <StatCard
              icon={Star}
              value={averageRating > 0 ? averageRating.toFixed(1) : "--"}
              label={t("averageRatingStat")}
              iconBgClass="bg-[#FFF8E1]"
            />
            <StatCard
              icon={CheckCircle}
              value={`${completionRate}%`}
              label={t("completionRate")}
              iconBgClass="bg-[#F5F0FF]"
            />
          </>
        )}
      </div>

      {/* Grid: Bookings + Payouts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming bookings */}
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg font-bold text-[#1A1A1A]">
              {t("upcomingBookingsTitle")}
            </CardTitle>
            <Link href="/educateur/reservations" className="inline-flex items-center gap-1 text-sm font-medium text-[#2E7D52] hover:underline">
              {tc("viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookingsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))
            ) : nextBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#8C8279]">
                {t("noUpcomingBookings")}
              </p>
            ) : (
              nextBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
                    <Users className="h-4 w-4 text-[#2E7D52]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {booking.family
                        ? `${booking.family.first_name} ${booking.family.last_name}`
                        : t("familyFallback")}
                      {booking.children_count
                        ? ` \u00B7 ${t("childCount", { count: booking.children_count })}`
                        : ""}
                    </p>
                    <p className="text-xs text-[#8C8279]">
                      {formatDate(booking.start_time)} &middot;{" "}
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)} &middot;{" "}
                      {getHours(booking.start_time, booking.end_time)}h
                    </p>
                  </div>
                  <Badge
                    className={
                      booking.status === "confirmed"
                        ? "bg-[#E8F5EE] text-[#2E7D52]"
                        : "bg-[#FFF3EE] text-[#C45B3E]"
                    }
                  >
                    {booking.status === "confirmed" ? t("statusConfirmed") : t("statusPending")}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Payout status */}
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-bold text-[#1A1A1A]">
              {t("payoutStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-1">
              <div className="rounded-xl bg-[#FAF8F5] p-4">
                <div className="flex items-center gap-2 text-sm text-[#8C8279]">
                  <CreditCard className="h-4 w-4" />
                  {t("nextPayout")}
                </div>
                <p className="mt-1 font-heading text-lg font-bold text-[#1A1A1A]">
                  {nextPendingPayout?.arrival_date
                    ? formatDate(nextPendingPayout.arrival_date)
                    : "--"}
                </p>
              </div>
              <div className="rounded-xl bg-[#FAF8F5] p-4">
                <div className="flex items-center gap-2 text-sm text-[#8C8279]">
                  <DollarSign className="h-4 w-4" />
                  {t("pendingAmount")}
                </div>
                <p className="mt-1 font-heading text-lg font-bold text-[#2E7D52]">
                  {formatCurrency(pendingAmount / 100)}
                </p>
              </div>
              <div className="rounded-xl bg-[#FAF8F5] p-4">
                <div className="flex items-center gap-2 text-sm text-[#8C8279]">
                  <TrendingUp className="h-4 w-4" />
                  {t("lastPayout")}
                </div>
                <p className="mt-1 font-heading text-lg font-bold text-[#1A1A1A]">
                  {lastCompletedPayout
                    ? formatCurrency(lastCompletedPayout.amount_cents / 100)
                    : "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
