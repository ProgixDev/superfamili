"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  CreditCard,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiGet } from "@/lib/api/client"

interface ConnectStatusResponse {
  data?: {
    connected?: boolean
    charges_enabled?: boolean
    payouts_enabled?: boolean
    details_submitted?: boolean
    status?: "pending" | "active" | null
  }
  // Older shape returned the fields directly without a `data` wrapper.
  connected?: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
  status?: "pending" | "active" | null
}

/**
 * Landing page Stripe redirects to once the educator finishes (or
 * thinks they finished) the Connect Express onboarding flow. Stripe
 * does NOT pass a status in the URL — we have to ask our backend,
 * which in turn fetches the live account from Stripe and writes the
 * normalized status back to `educator_profiles.stripe_account_status`.
 *
 * Three outcomes:
 *   - charges_enabled  → green, "you're all set"
 *   - details_submitted but not charges_enabled → orange, "Stripe is
 *     still reviewing / a step is missing"
 *   - neither → red, "you didn't finish"
 *
 * In all cases we also show navigation back to the dashboard / revenus
 * page so the user is never stranded the way they were on the bare
 * Next.js 404.
 */
export default function StripeOnboardingCompletePage() {
  const t = useTranslations("stripeOnboarding")
  const tc = useTranslations("common")
  const queryClient = useQueryClient()

  const { data: statusRes, isLoading } = useQuery<ConnectStatusResponse>({
    queryKey: ["stripe-connect-status"],
    queryFn: () => apiGet("/payments/stripe/connect-status"),
    // Force a fresh check — the whole point of this page is to confirm
    // the status that just changed on Stripe's side.
    staleTime: 0,
  })

  // Once the status is fetched, also invalidate the educator profile so
  // the dashboard's `Vérifié` badge / Stripe prompt update on next view.
  React.useEffect(() => {
    if (!statusRes) return
    queryClient.invalidateQueries({ queryKey: ["educator-profile"] })
  }, [statusRes, queryClient])

  const status = statusRes?.data ?? statusRes ?? {}
  const chargesEnabled = status.charges_enabled === true
  const detailsSubmitted =
    status.details_submitted === true || status.connected === true

  let variant: "loading" | "success" | "pending" | "incomplete" = "loading"
  if (!isLoading) {
    if (chargesEnabled) variant = "success"
    else if (detailsSubmitted) variant = "pending"
    else variant = "incomplete"
  }

  const iconWrapBase =
    "flex h-14 w-14 items-center justify-center rounded-full"
  const headingBase = "font-heading text-2xl font-bold text-[#1A1A1A]"

  return (
    <div className="flex min-h-[60vh] items-start justify-center pt-8">
      <Card className="w-full max-w-xl border-[#E8E4DF] bg-white">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          {variant === "loading" && (
            <>
              <div className={`${iconWrapBase} bg-[#FAF8F5]`}>
                <Loader2 className="h-7 w-7 animate-spin text-[#2E7D52]" />
              </div>
              <h1 className={headingBase}>{t("checkingTitle")}</h1>
              <p className="text-sm text-[#8C8279]">{t("checkingBody")}</p>
            </>
          )}

          {variant === "success" && (
            <>
              <div className={`${iconWrapBase} bg-[#E8F5EE]`}>
                <CheckCircle className="h-7 w-7 text-[#2E7D52]" />
              </div>
              <h1 className={headingBase}>{t("successTitle")}</h1>
              <p className="text-sm text-[#8C8279]">{t("successBody")}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Link href="/educateur/tableau-de-bord">
                  <Button className="bg-[#2E7D52] text-white hover:bg-[#256943]">
                    {t("goToDashboard")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/educateur/revenus">
                  <Button
                    variant="outline"
                    className="border-[#E8E4DF] text-[#1A1A1A]"
                  >
                    {t("viewRevenue")}
                  </Button>
                </Link>
              </div>
            </>
          )}

          {variant === "pending" && (
            <>
              <div className={`${iconWrapBase} bg-[#FFFBEB]`}>
                <AlertCircle className="h-7 w-7 text-[#92400E]" />
              </div>
              <h1 className={headingBase}>{t("pendingTitle")}</h1>
              <p className="text-sm text-[#8C8279]">{t("pendingBody")}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Link href="/educateur/revenus">
                  <Button className="bg-[#2E7D52] text-white hover:bg-[#256943]">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t("finishSetup")}
                  </Button>
                </Link>
                <Link href="/educateur/tableau-de-bord">
                  <Button
                    variant="outline"
                    className="border-[#E8E4DF] text-[#1A1A1A]"
                  >
                    {tc("dashboard")}
                  </Button>
                </Link>
              </div>
            </>
          )}

          {variant === "incomplete" && (
            <>
              <div className={`${iconWrapBase} bg-[#FFF3EE]`}>
                <AlertCircle className="h-7 w-7 text-[#C45B3E]" />
              </div>
              <h1 className={headingBase}>{t("incompleteTitle")}</h1>
              <p className="text-sm text-[#8C8279]">{t("incompleteBody")}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Link href="/educateur/revenus">
                  <Button className="bg-[#2E7D52] text-white hover:bg-[#256943]">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t("retrySetup")}
                  </Button>
                </Link>
                <Link href="/educateur/tableau-de-bord">
                  <Button
                    variant="outline"
                    className="border-[#E8E4DF] text-[#1A1A1A]"
                  >
                    {tc("dashboard")}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
