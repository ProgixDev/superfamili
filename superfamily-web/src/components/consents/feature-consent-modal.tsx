"use client"

import * as React from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"
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
import {
  useAcceptConsent,
  type ConsentType,
} from "@/hooks/use-consents"
import { toast } from "sonner"

/** Version of the per-feature policies. Seeded in the consents migration. */
const CURRENT_FEATURE_VERSION = "2026-04-11"

export interface FeatureConsentModalProps {
  /**
   * Which of the three per-feature consents this modal covers. Drives
   * the i18n namespace (`consents.kyc`, `consents.backgroundCheck`,
   * `consents.referenceContact`).
   */
  consentType: Extract<
    ConsentType,
    "kyc_verification" | "background_check_storage" | "reference_contact"
  >
  open: boolean
  onClose: () => void
  /**
   * Called after the consent is successfully persisted on the backend.
   * The parent component continues its flow (starts the KYC session,
   * opens the upload dialog, shows the reference form, etc.).
   */
  onAccepted: () => void
}

/**
 * Shared modal for the three per-feature consent gates. All three have
 * the same structure — intro paragraph, three bullet points, a single
 * required checkbox, accept/cancel buttons — so one component covers
 * them all. The differences are only in the i18n namespace.
 *
 * The modal persists the consent via `POST /consents/accept` before
 * calling `onAccepted`. If persistence fails, the parent flow does NOT
 * advance — the toast shows the error and the modal stays open so the
 * user can retry or cancel.
 */
export function FeatureConsentModal({
  consentType,
  open,
  onClose,
  onAccepted,
}: FeatureConsentModalProps) {
  const i18nKey = (() => {
    switch (consentType) {
      case "kyc_verification":
        return "consents.kyc"
      case "background_check_storage":
        return "consents.backgroundCheck"
      case "reference_contact":
        return "consents.referenceContact"
    }
  })()

  const t = useTranslations(i18nKey)
  const [checked, setChecked] = React.useState(false)
  const [viewerOpen, setViewerOpen] = React.useState(false)

  const acceptMutation = useAcceptConsent()

  // Reset on open — same reason as the signup modal.
  React.useEffect(() => {
    if (open) setChecked(false)
  }, [open])

  const handleAccept = () => {
    if (!checked) return
    acceptMutation.mutate(
      {
        consent_type: consentType,
        version: CURRENT_FEATURE_VERSION,
        accepted: true,
      },
      {
        onSuccess: () => {
          onAccepted()
        },
        onError: (err) => {
          toast.error(
            err?.message || "Erreur lors de l'enregistrement du consentement.",
          )
        },
      },
    )
  }

  const isSubmitting = acceptMutation.isPending

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => !o && !isSubmitting && onClose()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EE]">
                <ShieldCheck className="h-5 w-5 text-[#2E7D52]" />
              </div>
              <DialogTitle>{t("title")}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm leading-relaxed text-[#1A1A1A]">
              {consentType === "reference_contact"
                ? t("intro")
                : t("introTitle")}
            </p>

            <ul className="space-y-2 text-sm text-[#1A1A1A]">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D52]" />
                <span>{t("bullet1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D52]" />
                <span>{t("bullet2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D52]" />
                <span>{t("bullet3")}</span>
              </li>
            </ul>

            {/* KYC has an extra "note" line about data storage */}
            {consentType === "kyc_verification" && (
              <p className="rounded-lg bg-[#FAF8F5] px-3 py-2 text-xs text-[#8C8279]">
                {t("note")}
              </p>
            )}

            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="text-xs font-medium text-[#2E7D52] underline-offset-2 hover:underline"
            >
              {t("readFull")}
            </button>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 transition-colors hover:border-[#2E7D52]/50">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 size-4 rounded border-[#E8E4DF] text-[#2E7D52] accent-[#2E7D52]"
              />
              <span className="text-sm font-medium text-[#1A1A1A]">
                {t("checkbox")}
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[#E8E4DF]"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!checked || isSubmitting}
              className="bg-[#2E7D52] text-white hover:bg-[#256943] disabled:opacity-50"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {consentType === "kyc_verification"
                ? t("continue")
                : t("accept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested policy viewer — "read full consent" link */}
      <PolicyViewer
        consentType={viewerOpen ? consentType : null}
        onClose={() => setViewerOpen(false)}
      />
    </>
  )
}
