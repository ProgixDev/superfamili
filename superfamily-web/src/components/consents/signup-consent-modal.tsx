"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PolicyViewer } from "./policy-viewer"
import type { ConsentType } from "@/hooks/use-consents"

/** Versions from the current (2026-04-11) policy seed. */
export const SIGNUP_CONSENT_VERSIONS = {
  terms_of_use: "2026-04-11",
  privacy_policy: "2026-04-11",
  marketing_emails: "2026-04-11",
} as const

export interface SignupConsentDecisions {
  terms: true // must be true, enforced by the type
  privacy: true
  marketing: boolean
}

export interface SignupConsentModalProps {
  open: boolean
  onClose: () => void
  /**
   * Called when the user accepts the required consents. Receives the
   * three decisions. The caller is responsible for:
   *   1. Creating the user via Supabase auth + POST /auth/signup
   *   2. Calling POST /consents/accept three times with the decisions
   *
   * Splitting those two responsibilities out of this component keeps
   * the modal dumb — it doesn't know anything about auth.
   */
  onAccept: (decisions: SignupConsentDecisions) => void
  /** Disable the buttons while the parent is processing. */
  submitting?: boolean
}

/**
 * Signup consent modal. Shown AFTER the user fills the signup form and
 * clicks "Créer mon compte", BEFORE the actual Supabase auth call. The
 * user must check both "terms" and "privacy" checkboxes — the accept
 * button stays disabled until they do. Marketing is optional.
 */
export function SignupConsentModal({
  open,
  onClose,
  onAccept,
  submitting = false,
}: SignupConsentModalProps) {
  const t = useTranslations("consents.signup")

  const [termsAccepted, setTermsAccepted] = React.useState(false)
  const [privacyAccepted, setPrivacyAccepted] = React.useState(false)
  const [marketingAccepted, setMarketingAccepted] = React.useState(false)

  // Reset the checkboxes every time the modal opens so returning users
  // don't accidentally carry a prior decision.
  React.useEffect(() => {
    if (open) {
      setTermsAccepted(false)
      setPrivacyAccepted(false)
      setMarketingAccepted(false)
    }
  }, [open])

  // Which policy is open in the nested PolicyViewer (null = closed).
  const [viewerType, setViewerType] = React.useState<ConsentType | null>(null)

  const canAccept = termsAccepted && privacyAccepted && !submitting

  const handleAccept = () => {
    if (!canAccept) return
    onAccept({
      terms: true,
      privacy: true,
      marketing: marketingAccepted,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 transition-colors hover:border-[#2E7D52]/50">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 size-4 rounded border-[#E8E4DF] text-[#2E7D52] accent-[#2E7D52]"
              />
              <span className="text-sm text-[#1A1A1A]">
                {t("termsLabel")}{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setViewerType("terms_of_use")
                  }}
                  className="font-semibold text-[#2E7D52] underline-offset-2 hover:underline"
                >
                  {t("termsLink")}
                </button>
              </span>
            </label>

            {/* Privacy */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 transition-colors hover:border-[#2E7D52]/50">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 size-4 rounded border-[#E8E4DF] text-[#2E7D52] accent-[#2E7D52]"
              />
              <span className="text-sm text-[#1A1A1A]">
                {t("privacyLabel")}{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setViewerType("privacy_policy")
                  }}
                  className="font-semibold text-[#2E7D52] underline-offset-2 hover:underline"
                >
                  {t("privacyLink")}
                </button>
              </span>
            </label>

            {/* Marketing (optional) */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-[#E8E4DF] bg-white p-4 transition-colors hover:border-[#2E7D52]/50">
              <input
                type="checkbox"
                checked={marketingAccepted}
                onChange={(e) => setMarketingAccepted(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 size-4 rounded border-[#E8E4DF] text-[#2E7D52] accent-[#2E7D52]"
              />
              <span className="text-sm text-[#8C8279]">
                {t("marketingLabel")}
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="border-[#E8E4DF]"
            >
              {t("decline")}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!canAccept}
              className="bg-[#2E7D52] text-white hover:bg-[#256943] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loadingPolicies")}
                </>
              ) : (
                t("accept")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested markdown viewer */}
      <PolicyViewer
        consentType={viewerType}
        onClose={() => setViewerType(null)}
      />
    </>
  )
}
