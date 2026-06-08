"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "@tanstack/react-query"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiPost } from "@/lib/api/client"

interface ConnectAccountResponse {
  data?: { onboarding_url?: string }
  onboarding_url?: string
}

/**
 * Stripe redirects here when the AccountLink they handed us has expired
 * (they're single-use and time-bound). Our job is to ask the backend
 * for a fresh link and either auto-redirect or surface a "Retry" button
 * if anything failed.
 */
export default function StripeOnboardingRefreshPage() {
  const t = useTranslations("stripeOnboarding")
  const [autoTriggered, setAutoTriggered] = React.useState(false)

  const refresh = useMutation<ConnectAccountResponse>({
    mutationFn: () => apiPost("/payments/stripe/connect-account"),
    onSuccess: (response) => {
      const url = response?.data?.onboarding_url || response?.onboarding_url
      if (url) {
        // Use replace so the back button doesn't bounce the educator
        // back to this intermediate page.
        window.location.replace(url)
      }
    },
  })

  // Kick off automatically on mount — the educator should rarely have
  // to click anything; this is just a redirect waypoint.
  React.useEffect(() => {
    if (autoTriggered) return
    setAutoTriggered(true)
    refresh.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isError = refresh.isError

  return (
    <div className="flex min-h-[60vh] items-start justify-center pt-8">
      <Card className="w-full max-w-xl border-[#E8E4DF] bg-white">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          {!isError ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF8F5]">
                <Loader2 className="h-7 w-7 animate-spin text-[#2E7D52]" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
                {t("refreshTitle")}
              </h1>
              <p className="text-sm text-[#8C8279]">{t("refreshBody")}</p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF3EE]">
                <AlertCircle className="h-7 w-7 text-[#C45B3E]" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
                {t("refreshErrorTitle")}
              </h1>
              <p className="text-sm text-[#8C8279]">
                {refresh.error instanceof Error
                  ? refresh.error.message
                  : t("refreshErrorBody")}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => refresh.mutate()}
                  disabled={refresh.isPending}
                  className="bg-[#2E7D52] text-white hover:bg-[#256943]"
                >
                  {refresh.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("refreshRetrying")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("refreshRetry")}
                    </>
                  )}
                </Button>
                <Link href="/educateur/revenus">
                  <Button
                    variant="outline"
                    className="border-[#E8E4DF] text-[#1A1A1A]"
                  >
                    {t("backToRevenus")}
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
