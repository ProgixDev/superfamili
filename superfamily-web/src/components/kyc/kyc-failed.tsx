"use client"

import * as React from "react"
import { XCircle, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { KycStatus } from "@/hooks/use-kyc"

export interface KycFailedProps {
  /**
   * The actual terminal state — either `declined` (hard fail),
   * `review_required` (pending admin review), or `expired`. Each
   * renders a slightly different message.
   */
  status: Extract<KycStatus, "declined" | "review_required" | "expired">
  /**
   * Optional machine-readable reason string from Didit. When present,
   * shown as a secondary line. `null` hides it.
   */
  reason?: string | null
  /** Called when the user clicks the retry button. */
  onRetry: () => void
}

/**
 * Terminal non-success screen. Covers three Didit outcomes:
 *   - `declined`        → hard fail, user can retry
 *   - `review_required` → Didit flagged the session, admin reviews
 *   - `expired`         → session timed out, retry creates a new one
 *
 * For `review_required` there's no retry button — the user just waits
 * for a human decision. For the other two, retry creates a fresh
 * session (old sessions stay in the audit trail).
 */
export function KycFailed({ status, reason, onRetry }: KycFailedProps) {
  const t = useTranslations("kyc")
  const isReview = status === "review_required"

  return (
    <Card className="border-[#E8E4DF] bg-white">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
            isReview ? "bg-[#FFF3EE]" : "bg-red-50"
          }`}
        >
          {isReview ? (
            <Clock className="h-10 w-10 text-[#C45B3E]" />
          ) : (
            <XCircle className="h-10 w-10 text-red-600" />
          )}
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {isReview ? t("inReviewTitle") : t("failedTitle")}
          </h2>
          <p className="mt-2 text-sm text-[#8C8279]">
            {isReview ? t("inReviewSubtitle") : t("failedSubtitle")}
          </p>
        </div>

        {!isReview && reason && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">
            {t("failedReason", { reason })}
          </p>
        )}

        {/* No retry button when under human review — the user waits. */}
        {!isReview && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="mt-2 border-[#E8E4DF] text-[#1A1A1A]"
          >
            {t("retryButton")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
