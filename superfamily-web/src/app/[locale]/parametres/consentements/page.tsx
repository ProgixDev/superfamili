"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  Shield,
  Check,
  X,
  Clock,
  Download,
  Eye,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  useConsentHistory,
  useRevokeConsent,
  type ConsentHistoryRow,
  type ConsentType,
} from "@/hooks/use-consents"
import { PolicyViewer } from "@/components/consents/policy-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Consents flagged as "essential" — revoking one of these deactivates
 * the account and logs the user out. Anything else just flips the
 * consent record and optionally blocks a downstream feature.
 */
const ESSENTIAL_CONSENTS: ConsentType[] = ["terms_of_use", "privacy_policy"]

/**
 * Consent audit page.
 *
 *   - Table of every consent decision (GET /consents/history)
 *   - "View policy" opens the markdown viewer for the exact version
 *   - "Revoke" opens a confirmation dialog with Loi-25-appropriate
 *     warning copy
 *   - "Download as JSON" gives the user a Loi 25 data-export file
 *     (just the history payload as a downloadable JSON blob)
 *
 * Revocation of an essential consent (terms / privacy) additionally
 * signs the user out via Supabase. For the other consent types, the
 * next time the user hits a gated endpoint (KYC, background check,
 * references), the backend `requireConsent()` guard throws and the
 * frontend re-prompts.
 */
export default function ConsentAuditPage() {
  const t = useTranslations("consents.audit")
  const tTypes = useTranslations("consents.types")
  const tdt = useTranslations("dateTime")
  const dateLocale = tdt("locale")

  const { data: history, isLoading } = useConsentHistory()
  const revokeMutation = useRevokeConsent()

  const [viewerType, setViewerType] = React.useState<ConsentType | null>(null)
  const [viewerVersion, setViewerVersion] = React.useState<string | undefined>(
    undefined,
  )
  const [revokeTarget, setRevokeTarget] =
    React.useState<ConsentHistoryRow | null>(null)

  const formatDate = (iso: string | null) => {
    if (!iso) return "—"
    return new Date(iso).toLocaleString(dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // ── Download JSON export ─────────────────────────────────────────
  const downloadJson = React.useCallback(() => {
    if (!history) return
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `superfamili-consents-${new Date()
      .toISOString()
      .slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [history])

  // ── Revoke handler ───────────────────────────────────────────────
  const handleRevoke = React.useCallback(async () => {
    if (!revokeTarget) return
    const isEssential = ESSENTIAL_CONSENTS.includes(revokeTarget.consent_type)

    revokeMutation.mutate(revokeTarget.consent_type, {
      onSuccess: async () => {
        toast.success(t("revokeDialog.successToast"))
        setRevokeTarget(null)

        if (isEssential) {
          // Essential consent revoked → sign out. The backend's account
          // deactivation side effect (out of scope for this page) can
          // be wired via a downstream hook; for now we just log the
          // user out and let them re-accept on next sign-in.
          try {
            const supabase = createClient()
            await supabase.auth.signOut()
          } catch {
            // non-fatal
          }
          window.location.href = "/connexion"
        }
      },
      onError: () => {
        toast.error(t("revokeDialog.errorToast"))
      },
    })
  }, [revokeTarget, revokeMutation, t])

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EE]">
            <Shield className="h-5 w-5 text-[#2E7D52]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1A1A1A] md:text-3xl">
              {t("pageTitle")}
            </h1>
            <p className="mt-1 text-sm text-[#8C8279]">{t("pageSubtitle")}</p>
          </div>
        </div>
      </div>

      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg font-bold text-[#1A1A1A]">
            {history?.length ?? 0}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadJson}
            disabled={!history || history.length === 0}
            className="gap-2 border-[#E8E4DF]"
          >
            <Download className="h-4 w-4" />
            {t("downloadJson")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8C8279]">
              {t("empty")}
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((row) => {
                const isEffective = row.accepted && row.revoked_at === null
                const wasDeclined = !row.accepted
                const statusIcon = wasDeclined ? (
                  <X className="h-4 w-4 text-[#8C8279]" />
                ) : isEffective ? (
                  <Check className="h-4 w-4 text-[#2E7D52]" />
                ) : (
                  <Clock className="h-4 w-4 text-[#C45B3E]" />
                )
                const statusLabel = wasDeclined
                  ? t("statusDeclined")
                  : isEffective
                    ? t("statusActive")
                    : t("statusRevoked")
                const statusClass = wasDeclined
                  ? "bg-[#FAF8F5] text-[#8C8279]"
                  : isEffective
                    ? "bg-[#E8F5EE] text-[#1B5E38]"
                    : "bg-[#FFF3EE] text-[#C45B3E]"

                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1A1A1A]">
                          {tTypes(row.consent_type)}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
                        >
                          {statusIcon}
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8C8279]">
                        <span>v{row.version}</span>
                        <span>
                          {t("tableAcceptedAt")}: {formatDate(row.accepted_at)}
                        </span>
                        {row.revoked_at && (
                          <span>
                            {t("tableRevokedAt")}: {formatDate(row.revoked_at)}
                          </span>
                        )}
                        {row.ip_address && (
                          <span>
                            {t("tableIpAddress")}: {row.ip_address}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-[#E8E4DF]"
                        onClick={() => {
                          setViewerType(row.consent_type)
                          setViewerVersion(row.version)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("viewPolicy")}
                      </Button>
                      {isEffective && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setRevokeTarget(row)}
                        >
                          {t("revokeButton")}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy viewer — lets the user see the exact version they agreed to */}
      <PolicyViewer
        consentType={viewerType}
        version={viewerVersion}
        onClose={() => {
          setViewerType(null)
          setViewerVersion(undefined)
        }}
      />

      {/* Revoke confirmation — copy changes for essential vs non-essential */}
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revokeMutation.isPending) setRevokeTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("revokeDialog.title")}</DialogTitle>
            <DialogDescription>
              {revokeTarget &&
              ESSENTIAL_CONSENTS.includes(revokeTarget.consent_type)
                ? t("revokeDialog.bodyEssential")
                : t("revokeDialog.bodyNonEssential")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={revokeMutation.isPending}
              className="border-[#E8E4DF]"
            >
              {t("revokeDialog.cancel")}
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {revokeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {revokeTarget &&
              ESSENTIAL_CONSENTS.includes(revokeTarget.consent_type)
                ? t("revokeDialog.confirmEssential")
                : t("revokeDialog.confirmNonEssential")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
