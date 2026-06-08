"use client"

import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export interface KycSuccessProps {
  /**
   * Didit confidence score (0–100). When present, it's shown below
   * the success message as a small factoid. `null` hides the line.
   */
  confidenceScore?: number | null
  /** Called when the user clicks the continue button. */
  onContinue: () => void
}

/**
 * Terminal success screen. Rendered after the KYC gateway emits a
 * `kyc:status-updated` event with `status=approved` for the current
 * user (or after the polling query flips to the same state).
 */
export function KycSuccess({ confidenceScore, onContinue }: KycSuccessProps) {
  const t = useTranslations("kyc")

  return (
    <Card className="border-[#E8E4DF] bg-white">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE]">
          <CheckCircle2 className="h-10 w-10 text-[#2E7D52]" />
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {t("successTitle")}
          </h2>
          <p className="mt-2 text-sm text-[#8C8279]">{t("successSubtitle")}</p>
        </div>

        {typeof confidenceScore === "number" && (
          <p className="rounded-full bg-[#FAF8F5] px-4 py-1.5 text-xs font-medium text-[#8C8279]">
            {t("successScore", { score: Math.round(confidenceScore) })}
          </p>
        )}

        <Button
          onClick={onContinue}
          className="mt-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
        >
          {t("continueButton")}
        </Button>
      </CardContent>
    </Card>
  )
}
