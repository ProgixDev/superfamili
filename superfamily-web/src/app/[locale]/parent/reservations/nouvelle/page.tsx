"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  User,
  CreditCard,
  Check,
  Loader2,
  ShieldCheck,
  Search,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { apiGet, apiPost } from "@/lib/api/client"
import { toast } from "sonner"
import { CitySelect } from "@/components/search/city-select"
import {
  WeeklyAvailabilityPicker,
  weeklyPickerUtils,
  type AvailabilitySlot,
  type BusyRange,
  type WeeklySelection,
} from "@/components/booking/weekly-availability-picker"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
)

const STEPS = [
  { label: "Éducateur", icon: Search },
  { label: "Date et heure", icon: CalendarDays },
  { label: "Service et enfant", icon: User },
  { label: "Récapitulatif et paiement", icon: CreditCard },
]

// The actual checkout form inside Stripe Elements
function CheckoutForm({
  amount,
  returnUrl,
  onSuccess,
}: {
  amount: number
  /**
   * Absolute URL Stripe redirects to when 3DS or another auth step
   * forces a navigation away from the page. MUST include the locale
   * prefix — otherwise Stripe sends the user to a 404 on return.
   */
  returnUrl: string
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    // Wrap in try/catch — without it, any throw from confirmPayment
    // leaves the button locked on "Traitement en cours…" forever.
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      })

      if (submitError) {
        setError(submitError.message || "Erreur lors du paiement")
        setLoading(false)
      } else {
        // onSuccess navigates away — no need to clear `loading`,
        // the component will unmount.
        onSuccess()
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du paiement"
      setError(message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-[#2E7D52] py-6 text-base font-semibold text-white hover:bg-[#256943]"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-5 w-5" />
            Payer {(amount / 100).toFixed(2).replace(".", ",")} $
          </>
        )}
      </Button>
      <p className="text-center text-xs text-[#8C8279]">
        Paiement sécurisé par Stripe. Vos informations sont chiffrées.
      </p>
    </form>
  )
}

function NouvelleReservationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Locale comes from the dynamic [locale] segment. Without it our
  // post-payment navigation would push to "/parent/reservations" which
  // doesn't match any route (no top-level /parent — only /[locale]/parent),
  // 404'ing and looking like a stuck/looping page in dev.
  const params = useParams<{ locale: string }>()
  const locale = params?.locale ?? "fr"

  // Pre-filled from URL (from search page) or picked inline
  const [selectedEducator, setSelectedEducator] = React.useState<{
    id: string; serviceId: string; name: string; hourlyRate: number
  } | null>(() => {
    const eid = searchParams.get("educator_id")
    const sid = searchParams.get("service_id")
    const ename = searchParams.get("educator_name")
    const erate = Number(searchParams.get("hourly_rate") || 0)
    if (eid && sid) return { id: eid, serviceId: sid, name: ename || "", hourlyRate: erate }
    return null
  })

  // Skip step 0 if educator already selected from URL
  const [step, setStep] = React.useState(selectedEducator ? 1 : 0)
  // The weekly availability picker drives all three of these — they
  // start empty and only get values once the parent picks a slot.
  const [date, setDate] = React.useState("")
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [postalCode, setPostalCode] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [selectedChildIds, setSelectedChildIds] = React.useState<string[]>([])

  // Educator search state
  const [searchCity, setSearchCity] = React.useState("")
  const { data: educatorsRes, isLoading: educatorsLoading, isError: educatorsError } = useQuery<any>({
    queryKey: ["search-educators-booking", searchCity],
    queryFn: () => apiGet("/educators/search", { city: searchCity, limit: "20" }),
    enabled: !!searchCity,
    retry: 1,
  })
  const educators: any[] = educatorsRes?.data || []

  // Stripe state
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [amountCents, setAmountCents] = React.useState(0)
  const [creatingBooking, setCreatingBooking] = React.useState(false)

  // Load parent profile with children
  const { data: parentRes } = useQuery<any>({
    queryKey: ["parent-me"],
    queryFn: () => apiGet("/parents/me"),
  })
  const children: any[] = parentRes?.data?.children || parentRes?.children || []
  const parentCity = (parentRes?.data as any)?.city || (parentRes as any)?.city || ""

  // Auto-set search city from parent profile
  React.useEffect(() => {
    if (parentCity && !searchCity) setSearchCity(parentCity)
  }, [parentCity, searchCity])

  // ─── Educator availability + busy slots ────────────────────────────
  // Two queries:
  //   1. The educator's public profile, which carries their recurring
  //      weekly availability (educator_availability rows).
  //   2. The educator's already-booked time ranges for the visible
  //      week, fetched from a dedicated PII-free endpoint so we can
  //      grey out occupied cells in the picker.
  const { data: educatorProfileRes } = useQuery<any>({
    queryKey: ["educator-public-profile", selectedEducator?.id],
    queryFn: () => apiGet(`/educators/${selectedEducator?.id}`),
    enabled: !!selectedEducator?.id,
    staleTime: 5 * 60 * 1000,
  })

  const educatorAvailability: AvailabilitySlot[] = React.useMemo(() => {
    const raw =
      educatorProfileRes?.data?.educator_availability ??
      educatorProfileRes?.educator_availability ??
      []
    return Array.isArray(raw)
      ? raw.filter((s: any) => s && s.is_available !== false)
      : []
  }, [educatorProfileRes])

  // Visible week — defaults to the Monday of today's week, but if
  // today falls on Saturday or Sunday we bump to the *next* Monday so
  // the parent doesn't land on a week that's almost entirely in the
  // past (which would make the whole grid look empty).
  const [weekStart, setWeekStart] = React.useState<string>(() => {
    const now = new Date()
    const dow = now.getDay() // Sun=0..Sat=6
    if (dow === 0 || dow === 6) {
      const daysUntilNextMonday = dow === 0 ? 1 : 2
      now.setDate(now.getDate() + daysUntilNextMonday)
    }
    const iso = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    return weeklyPickerUtils.mondayOf(iso)
  })

  // Pull the educator's busy ranges for the visible week (Mon..Sun+1).
  // The API caps requests at 45 days; one week is well within that.
  const weekFromIso = `${weekStart}T00:00:00`
  const weekToIso = `${weeklyPickerUtils.addDays(weekStart, 7)}T00:00:00`
  const { data: busyRes, isLoading: busyLoading } = useQuery<BusyRange[]>({
    queryKey: ["educator-busy", selectedEducator?.id, weekStart],
    queryFn: () =>
      apiGet(`/educators/${selectedEducator?.id}/busy`, {
        from: weekFromIso,
        to: weekToIso,
      }),
    enabled: !!selectedEducator?.id,
    // Busy ranges become stale fast (a booking can land any moment),
    // so don't cache aggressively.
    staleTime: 30 * 1000,
  })

  const busyRanges: BusyRange[] = React.useMemo(() => {
    const raw = (busyRes as any)?.data ?? busyRes ?? []
    return Array.isArray(raw) ? raw : []
  }, [busyRes])

  // The new weekly picker hands us a single { date, startTime, endTime }
  // object. Mirror it into the existing `date`/`startTime`/`endTime`
  // state so the rest of the page (summary, payment, submit) keeps
  // working unchanged.
  const weeklySelection: WeeklySelection | null = React.useMemo(() => {
    if (!date || !startTime || !endTime) return null
    return { date, startTime, endTime }
  }, [date, startTime, endTime])

  const handleWeeklySelectionChange = React.useCallback(
    (sel: WeeklySelection | null) => {
      if (!sel) {
        setDate("")
        setStartTime("")
        setEndTime("")
        return
      }
      setDate(sel.date)
      setStartTime(sel.startTime)
      setEndTime(sel.endTime)
    },
    [],
  )

  const toggleChild = (id: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function pickEducator(educator: any) {
    const profile = educator.profiles || {}
    const firstService = educator.educator_services?.[0]
    // service_id is the FK to services table, services.id is the nested join
    const svcId = firstService?.service_id || firstService?.services?.id || ""
    setSelectedEducator({
      id: educator.id,
      serviceId: svcId,
      name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
      hourlyRate: firstService?.hourly_rate_cents || 0,
    })
    setStep(1)
  }

  const educatorId = selectedEducator?.id || ""
  const serviceId = selectedEducator?.serviceId || ""
  const educatorName = selectedEducator?.name || ""
  const hourlyRate = selectedEducator?.hourlyRate || 0

  const canNext =
    step === 0
      ? !!selectedEducator
      : step === 1
        ? // The weekly grid only emits valid selections (consecutive,
          // available, not occupied). So the only thing left to verify
          // is that there *is* a selection.
          !!date && !!startTime && !!endTime && startTime < endTime
        : step === 2
          ? selectedChildIds.length > 0
          : true

  // Calculate duration
  const durationHours = React.useMemo(() => {
    if (!startTime || !endTime) return 0
    const [sh, sm] = startTime.split(":").map(Number)
    const [eh, em] = endTime.split(":").map(Number)
    return Math.max(0, eh + em / 60 - (sh + sm / 60))
  }, [startTime, endTime])

  // When reaching step 2, create booking + payment intent
  const handleGoToPayment = async () => {
    if (creatingBooking) return
    setCreatingBooking(true)

    try {
      const bookingResp = await apiPost<any>("/bookings", {
        educator_profile_id: educatorId,
        service_id: serviceId,
        child_id: selectedChildIds[0] || undefined,
        booking_date_start: `${date}T${startTime}:00-04:00`,
        booking_date_end: `${date}T${endTime}:00-04:00`,
        duration_hours: durationHours,
        ...(postalCode ? { location_postal_code: postalCode.toUpperCase() } : {}),
        notes: notes || undefined,
      })

      const bId = bookingResp?.data?.id || bookingResp?.id
      if (!bId) throw new Error("Erreur lors de la création de la réservation")

      setAmountCents(
        bookingResp?.data?.total_amount_cents ||
          bookingResp?.total_amount_cents ||
          0
      )

      const piResp = await apiPost<any>("/payments/create-intent", {
        booking_id: bId,
      })

      const secret = piResp?.data?.client_secret || piResp?.client_secret
      if (!secret) throw new Error("Erreur lors de la creation du paiement")

      setClientSecret(secret)
      setStep(3)
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la réservation")
    } finally {
      setCreatingBooking(false)
    }
  }

  const handlePaymentSuccess = () => {
    toast.success("Paiement confirmé ! Votre réservation est active.")
    // `replace` so the back button doesn't bounce the parent back into
    // the now-finalized payment form. Locale prefix is required —
    // without it the route doesn't exist and Next.js would loop on a
    // 404 compile in dev.
    router.replace(`/${locale}/parent/reservations`)
  }

  const educatorInitials = educatorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const hourlyRateDisplay =
    hourlyRate > 0
      ? (hourlyRate / 100).toFixed(2).replace(".", ",") + " $/h"
      : "—"

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
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Nouvelle réservation
          </h1>
          <p className="text-sm text-[#8C8279]">
            Complétez les étapes pour réserver un éducateur
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.label}>
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                i === step
                  ? "bg-[#2E7D52] text-white"
                  : i < step
                    ? "bg-[#E8F5EE] text-[#2E7D52]"
                    : "bg-[#F5F3F0] text-[#8C8279]"
              }`}
            >
              {i < step ? (
                <Check className="h-4 w-4" />
              ) : (
                <s.icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px flex-1 ${i < step ? "bg-[#2E7D52]" : "bg-[#E8E4DF]"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Pick educator */}
      {step === 0 && (
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
              <Search className="h-5 w-5 text-[#2E7D52]" />
              Choisir un éducateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CitySelect
              value={searchCity}
              onChange={setSearchCity}
              placeholder="Sélectionnez une ville"
            />
            {educatorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-[#2E7D52]" />
              </div>
            ) : !searchCity ? (
              <p className="py-8 text-center text-sm text-[#8C8279]">
                Sélectionnez une ville pour voir les éducateurs disponibles.
              </p>
            ) : educatorsError ? (
              <p className="py-8 text-center text-sm text-red-600">
                Erreur lors du chargement des éducateurs. Veuillez réessayer.
              </p>
            ) : educators.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#8C8279]">
                Aucun éducateur disponible dans cette ville.
              </p>
            ) : (
              <div className="space-y-2">
                {educators.map((educator: any) => {
                  const profile = educator.profiles || {}
                  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                  const firstService = educator.educator_services?.[0]
                  const rate = firstService?.hourly_rate_cents
                    ? `${(firstService.hourly_rate_cents / 100).toFixed(2).replace(".", ",")} $/h`
                    : ""
                  const rating = educator.average_rating
                  const city = profile.city || ""
                  const dist = educator.distance_km

                  return (
                    <button
                      key={educator.id}
                      type="button"
                      onClick={() => pickEducator(educator)}
                      className="flex w-full items-center gap-4 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 text-left transition-colors hover:border-[#2E7D52] hover:bg-[#E8F5EE]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-sm font-bold text-[#2E7D52]">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#1A1A1A]">{name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#8C8279]">
                          {rating != null && (
                            <span className="flex items-center gap-0.5">
                              <Star className="size-3 fill-[#F59E0B] text-[#F59E0B]" />
                              {rating.toFixed(1)}
                            </span>
                          )}
                          {city && <span>{city}</span>}
                          {dist != null && dist > 0 && <span>{dist.toFixed(1)} km</span>}
                          {firstService?.services?.name && (
                            <span className="rounded-full bg-white px-2 py-0.5">{firstService.services.name}</span>
                          )}
                        </div>
                      </div>
                      {rate && (
                        <span className="shrink-0 text-sm font-bold text-[#2E7D52]">{rate}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Date and time */}
      {step === 1 && (
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
              <CalendarDays className="h-5 w-5 text-[#2E7D52]" />
              Choisissez la date et l&apos;heure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Weekly availability grid — replaces the old separate
                date/start/end pickers. The educator's hours are shown
                in green, existing bookings in grey, and the parent
                clicks (and extends) consecutive cells to define the
                booking window. */}
            <p className="text-sm text-[#8C8279]">
              Cliquez sur un créneau libre, puis sur les créneaux adjacents
              pour étendre la durée. Les heures doivent être consécutives.
            </p>
            {educatorAvailability.length === 0 ? (
              <div className="rounded-lg bg-[#FFF3EE] p-3 text-sm text-[#C45B3E]">
                Cet éducateur n&apos;a pas encore défini de disponibilités.
                Choisissez un autre éducateur.
              </div>
            ) : (
              <WeeklyAvailabilityPicker
                availability={educatorAvailability}
                busyRanges={busyRanges}
                weekStart={weekStart}
                onWeekChange={setWeekStart}
                value={weeklySelection}
                onChange={handleWeeklySelectionChange}
                busyLoading={busyLoading}
              />
            )}

            {/* Postal code stays separate — it's not part of the time
                pick but it's required at booking-create time. */}
            <div className="space-y-2">
              <Label htmlFor="postal">Code postal du lieu de garde</Label>
              <div className="relative max-w-sm">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8279]" />
                <Input
                  id="postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="border-[#E8E4DF] pl-10"
                  placeholder="H2X 1Y4"
                />
              </div>
            </div>

            {durationHours > 0 && (
              <div className="rounded-lg bg-[#E8F5EE] p-3 text-sm text-[#2E7D52]">
                Sélectionné: {date} · {startTime} – {endTime} · {durationHours}h
                {hourlyRate > 0 && (
                  <> — Estimation: {((durationHours * hourlyRate) / 100).toFixed(2).replace(".", ",")} $</>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Service and child */}
      {step === 2 && (
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
              <User className="h-5 w-5 text-[#2E7D52]" />
              Service et enfant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Éducateur sélectionné</Label>
              <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5EE] text-sm font-bold text-[#2E7D52]">
                  {educatorInitials}
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A]">{educatorName}</p>
                  <p className="text-sm text-[#8C8279]">
                    {hourlyRateDisplay}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Enfant</Label>
              {children.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-6 text-center">
                  <p className="text-sm text-[#8C8279]">
                    Aucun enfant enregistré.{" "}
                    <Link
                      href="/parent/enfants"
                      className="font-medium text-[#2E7D52] hover:underline"
                    >
                      Ajouter un enfant
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {children.map((child: any) => (
                    <div
                      key={child.id}
                      onClick={() => toggleChild(child.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                        selectedChildIds.includes(child.id)
                          ? "border-[#2E7D52] bg-[#E8F5EE]"
                          : "border-[#E8E4DF] bg-[#FAF8F5]"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-[#2E7D52]">
                        {child.first_name?.[0] || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">
                          {child.first_name}
                        </p>
                        <p className="text-sm text-[#8C8279]">
                          {child.age_group}
                        </p>
                      </div>
                      {selectedChildIds.includes(child.id) && (
                        <Check className="ml-auto h-5 w-5 text-[#2E7D52]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes pour l&apos;educateur (optionnel)
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions spéciales, allergies, etc."
                className="border-[#E8E4DF]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Summary + Stripe Payment */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="border-[#E8E4DF] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
                <CreditCard className="h-5 w-5 text-[#2E7D52]" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#8C8279]">Éducateur</span>
                <span className="font-medium text-[#1A1A1A]">
                  {educatorName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8C8279]">Date</span>
                <span className="font-medium text-[#1A1A1A]">
                  {date || "Non définie"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8C8279]">Horaire</span>
                <span className="font-medium text-[#1A1A1A]">
                  {startTime} — {endTime}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8C8279]">Durée</span>
                <span className="font-medium text-[#1A1A1A]">
                  {durationHours} heure{durationHours > 1 ? "s" : ""}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-[#8C8279]">
                  Sous-total ({hourlyRateDisplay} x {durationHours}h)
                </span>
                <span className="font-medium text-[#1A1A1A]">
                  {(amountCents / 100).toFixed(2).replace(".", ",")} $
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span className="text-[#1A1A1A]">Total</span>
                <span className="text-[#2E7D52]">
                  {(amountCents / 100).toFixed(2).replace(".", ",")} $
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Elements Payment Form */}
          <Card className="border-[#E8E4DF] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
                <ShieldCheck className="h-5 w-5 text-[#2E7D52]" />
                Paiement sécurisé
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#2E7D52",
                        borderRadius: "12px",
                        fontFamily: "'DM Sans', sans-serif",
                      },
                    },
                    // Match Stripe Elements' UI language to the user's
                    // actual app locale. Falls back to 'fr' since that's
                    // the platform default and what we hardcoded before.
                    locale: locale === "en" ? "en" : "fr",
                  }}
                >
                  <CheckoutForm
                    amount={amountCents}
                    // 3DS / authenticated payment methods make Stripe
                    // redirect the browser to this URL after completion.
                    // It MUST include the locale prefix or the user
                    // lands on a 404 page.
                    returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/parent/reservations`}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              ) : (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2E7D52]" />
                  <p className="mt-3 text-sm text-[#8C8279]">
                    Chargement du formulaire de paiement...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation (steps 1 and 2 only — step 0 auto-advances on pick, step 3 is payment) */}
      {step >= 1 && step <= 2 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            className="border-[#E8E4DF]"
          >
            Précédent
          </Button>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!canNext}
              className="bg-[#2E7D52] text-white hover:bg-[#256943]"
            >
              Suivant
            </Button>
          ) : (
            <Button
              onClick={handleGoToPayment}
              disabled={creatingBooking || !canNext}
              className="bg-[#2E7D52] text-white hover:bg-[#256943]"
            >
              {creatingBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Passer au paiement"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function NouvelleReservationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2E7D52] border-t-transparent" /></div>}>
      <NouvelleReservationContent />
    </Suspense>
  )
}
