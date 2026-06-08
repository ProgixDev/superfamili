"use client"

import * as React from "react"
import {
  Loader2,
  ShieldCheck,
  QrCode,
  Copy,
  Mail,
  Smartphone,
  Check,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCodeDisplay } from "./qr-code-display"
import { KycStatusListener } from "./kyc-status-listener"
import { KycSuccess } from "./kyc-success"
import { KycFailed } from "./kyc-failed"
import { FeatureConsentModal } from "@/components/consents/feature-consent-modal"
import { useIsMobile } from "@/hooks/use-is-mobile"
import {
  useCreateKycSession,
  useKycStatus,
  type KycSession,
  type KycStatus,
  type KycStatusChangedPayload,
} from "@/hooks/use-kyc"
import { useRequiredConsents } from "@/hooks/use-consents"

export interface KycHandoffProps {
  /**
   * Educator profile id (profiles.id). Required for the realtime
   * socket handshake; if the parent component hasn't loaded the
   * profile yet, pass `undefined` — the handoff will wait.
   */
  profileId: string | undefined
  /** Called once KYC reaches `approved`. */
  onComplete: (result: { confidenceScore: number | null }) => void
  /** Called on terminal failure. */
  onError?: (error: Error) => void
}

type Phase =
  | { kind: "checking-consent" } // initial — waiting for /consents/required
  | { kind: "awaiting-consent" } // modal visible, user hasn't decided yet
  | { kind: "loading-session" }
  | { kind: "session-error"; error: Error }
  | { kind: "handoff"; session: KycSession } // desktop: QR + waiting
  | { kind: "mobile-redirect"; session: KycSession } // mobile: redirected
  | { kind: "in-progress"; session: KycSession } // user has started on phone
  | { kind: "success"; confidenceScore: number | null }
  | {
      kind: "failed"
      status: Extract<KycStatus, "declined" | "review_required" | "expired">
      reason: string | null
    }

/**
 * The main KYC orchestrator — one self-contained component that
 * covers the entire educator-facing verification flow:
 *
 *   1. Create a Didit session on mount (POST /kyc/session).
 *   2. Detect device:
 *        - Mobile: redirect to the Didit URL in the same window.
 *        - Desktop: render the QR handoff screen + link fallback.
 *   3. Subscribe to the `/kyc` WebSocket for real-time status updates,
 *      and run `useKycStatus` as a polling fallback in parallel.
 *   4. On `approved` → show `KycSuccess`, call `onComplete`.
 *      On `declined` / `expired` → show `KycFailed` with retry.
 *      On `review_required` → show `KycFailed` with the "wait" variant.
 *
 * The component owns the phase state — the parent only sees the
 * final `onComplete` / `onError` callbacks, which is what makes
 * dropping this into any signup step trivial.
 */
export function KycHandoff({
  profileId,
  onComplete,
  onError,
}: KycHandoffProps) {
  const t = useTranslations("kyc")
  const isMobile = useIsMobile()

  // Start in the checking-consent phase. The `useRequiredConsents`
  // query below resolves it to either `awaiting-consent` (show the
  // modal) or `loading-session` (skip straight to creating the Didit
  // session, because the user already accepted previously).
  const [phase, setPhase] = React.useState<Phase>({ kind: "checking-consent" })

  const createSession = useCreateKycSession()

  // ── 0. Consent gate ────────────────────────────────────────────────
  // Fetch the list of required consents. The backend filters for this
  // user's role so we only see consents that actually apply. The
  // `kyc_verification` entry tells us whether the modal is needed.
  const { data: requiredConsents, isLoading: consentsLoading } =
    useRequiredConsents()

  React.useEffect(() => {
    if (phase.kind !== "checking-consent") return
    if (consentsLoading) return
    if (!requiredConsents) return

    const kycConsent = requiredConsents.find(
      (c) => c.consent_type === "kyc_verification",
    )
    // If the user has already accepted the current version, skip the
    // modal entirely. Otherwise open it and wait for their decision.
    if (kycConsent?.already_accepted) {
      setPhase({ kind: "loading-session" })
    } else {
      setPhase({ kind: "awaiting-consent" })
    }
  }, [phase.kind, consentsLoading, requiredConsents])

  // ── 1. Create the session when phase flips to `loading-session` ───
  React.useEffect(() => {
    if (phase.kind !== "loading-session") return

    let cancelled = false

    createSession.mutate(undefined, {
      onSuccess: (session) => {
        if (cancelled) return

        if (isMobile) {
          // Redirect the same window straight into Didit. The webhook
          // will update the backend; the user closes the tab on their
          // own once done. No further UI from us on mobile.
          setPhase({ kind: "mobile-redirect", session })
          window.location.href = session.verification_url
          return
        }

        setPhase({ kind: "handoff", session })
      },
      onError: (error) => {
        if (cancelled) return
        setPhase({ kind: "session-error", error })
        onError?.(error)
      },
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind])

  // ── 2. Polling fallback (runs once we have a session, desktop only) ──
  // Enabled only on desktop handoff — on mobile the same window has
  // navigated away so there's nothing to poll.
  const pollEnabled =
    (phase.kind === "handoff" || phase.kind === "in-progress") && !isMobile
  const { data: polledStatus } = useKycStatus(pollEnabled)

  // ── 3. Handle status transitions (both from WS and polling) ────────
  const handleStatusChange = React.useCallback(
    (update: KycStatusChangedPayload) => {
      setPhase((current) => {
        switch (update.status) {
          case "approved":
            onComplete({ confidenceScore: update.confidence_score })
            return {
              kind: "success",
              confidenceScore: update.confidence_score,
            }
          case "declined":
            return { kind: "failed", status: "declined", reason: null }
          case "review_required":
            return {
              kind: "failed",
              status: "review_required",
              reason: null,
            }
          case "expired":
            return { kind: "failed", status: "expired", reason: null }
          case "in_progress":
            // Only transition from "handoff" into "in-progress" — don't
            // bounce a terminal state backwards.
            if (current.kind === "handoff") {
              return { kind: "in-progress", session: current.session }
            }
            return current
          default:
            return current
        }
      })
    },
    [onComplete],
  )

  // Fold the polling result into the same transition logic so sockets
  // and polling can't diverge.
  React.useEffect(() => {
    if (!polledStatus) return
    handleStatusChange({
      status: polledStatus.status,
      confidence_score: polledStatus.confidence_score,
    })
  }, [polledStatus, handleStatusChange])

  // ── 4. Retry: create a fresh session ───────────────────────────────
  const retry = React.useCallback(() => {
    setPhase({ kind: "loading-session" })
    createSession.mutate(undefined, {
      onSuccess: (session) => {
        if (isMobile) {
          window.location.href = session.verification_url
          setPhase({ kind: "mobile-redirect", session })
        } else {
          setPhase({ kind: "handoff", session })
        }
      },
      onError: (error) => {
        setPhase({ kind: "session-error", error })
        onError?.(error)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, onError])

  // ── Render ──────────────────────────────────────────────────────────

  // Consent gate screen — shows the modal over a subtle placeholder
  // card so the page isn't blank while the user makes a decision.
  if (phase.kind === "checking-consent" || phase.kind === "awaiting-consent") {
    return (
      <>
        <Card className="border-[#E8E4DF] bg-white">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#2E7D52]" />
            <p className="text-sm text-[#8C8279]">{t("creatingSession")}</p>
          </CardContent>
        </Card>
        <FeatureConsentModal
          consentType="kyc_verification"
          open={phase.kind === "awaiting-consent"}
          onClose={() => {
            // Cancelling the consent modal is treated as a user abort —
            // we bubble it up to the parent as a session error so the
            // page can offer "try again" or a back link.
            const err = new Error("Consentement annulé")
            setPhase({ kind: "session-error", error: err })
            onError?.(err)
          }}
          onAccepted={() => {
            // Consent recorded — proceed into the existing Didit flow.
            setPhase({ kind: "loading-session" })
          }}
        />
      </>
    )
  }

  if (phase.kind === "loading-session") {
    return (
      <Card className="border-[#E8E4DF] bg-white">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#2E7D52]" />
          <p className="text-sm text-[#8C8279]">{t("creatingSession")}</p>
        </CardContent>
      </Card>
    )
  }

  if (phase.kind === "session-error") {
    return (
      <Card className="border-[#E8E4DF] bg-white">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-red-600">{t("createSessionError")}</p>
          <Button
            onClick={retry}
            variant="outline"
            className="border-[#E8E4DF]"
          >
            {t("retryButton")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase.kind === "mobile-redirect") {
    // Window is about to navigate; brief stub so there's no flicker
    // in the split-second before `window.location.href` kicks in.
    return (
      <Card className="border-[#E8E4DF] bg-white">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#2E7D52]" />
          <p className="text-sm text-[#8C8279]">{t("creatingSession")}</p>
        </CardContent>
      </Card>
    )
  }

  if (phase.kind === "success") {
    return (
      <>
        <KycStatusListener
          profileId={profileId}
          onStatusChange={handleStatusChange}
        />
        <KycSuccess
          confidenceScore={phase.confidenceScore}
          onContinue={() =>
            onComplete({ confidenceScore: phase.confidenceScore })
          }
        />
      </>
    )
  }

  if (phase.kind === "failed") {
    return (
      <>
        <KycStatusListener
          profileId={profileId}
          onStatusChange={handleStatusChange}
        />
        <KycFailed status={phase.status} reason={phase.reason} onRetry={retry} />
      </>
    )
  }

  // handoff or in-progress — render the QR screen.
  const session = phase.session

  return (
    <>
      <KycStatusListener
        profileId={profileId}
        onStatusChange={handleStatusChange}
      />
      <DesktopHandoffScreen
        verificationUrl={session.verification_url}
        isWaiting={phase.kind === "in-progress"}
      />
    </>
  )
}

// ─── Desktop handoff sub-screen ─────────────────────────────────────
// Kept as a local helper (not a standalone file) because it's only
// ever rendered by KycHandoff and its layout is tightly coupled to
// the state machine above.

function DesktopHandoffScreen({
  verificationUrl,
  isWaiting,
}: {
  verificationUrl: string
  isWaiting: boolean
}) {
  const t = useTranslations("kyc")
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl)
      setCopied(true)
      toast.success(t("linkCopied"))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked by permissions — fall back to a toast.
      toast.error(t("createSessionError"))
    }
  }, [verificationUrl, t])

  return (
    <Card className="border-[#E8E4DF] bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EE]">
            <ShieldCheck className="h-5 w-5 text-[#2E7D52]" />
          </div>
          <div>
            <CardTitle className="font-heading text-xl font-bold text-[#1A1A1A]">
              {t("title")}
            </CardTitle>
            <p className="mt-1 text-sm text-[#8C8279]">{t("subtitle")}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-sm leading-relaxed text-[#1A1A1A]">
          {t("pageIntroDesktop")}
        </p>

        {/* Main row: QR code + steps */}
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex justify-center md:justify-start">
            <QrCodeDisplay url={verificationUrl} />
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
              <QrCode className="h-4 w-4 text-[#2E7D52]" />
              {t("scanInstructions")}
            </p>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8C8279]">
              {t("stepsTitle")}
            </p>
            <ol className="space-y-2 text-sm text-[#1A1A1A]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-xs font-bold text-[#2E7D52]">
                  1
                </span>
                <span>{t("step1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-xs font-bold text-[#2E7D52]">
                  2
                </span>
                <span>{t("step2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-xs font-bold text-[#2E7D52]">
                  3
                </span>
                <span>{t("step3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-xs font-bold text-[#2E7D52]">
                  4
                </span>
                <span>{t("step4")}</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Link fallback row */}
        <div className="rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8C8279]">
            {t("linkFallbackTitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-[#E8E4DF]"
              onClick={() => toast.info(t("emailComingSoon"))}
            >
              <Mail className="h-4 w-4" />
              {t("linkEmail")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-[#E8E4DF]"
              onClick={() => toast.info(t("smsComingSoon"))}
            >
              <Smartphone className="h-4 w-4" />
              {t("linkSms")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-[#E8E4DF]"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-[#2E7D52]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {t("linkCopy")}
            </Button>
          </div>
        </div>

        {/* Waiting indicator */}
        <div className="flex items-center gap-3 rounded-xl bg-[#FFFBEB] px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#92400E]">
              {t("waiting")}
            </p>
            <p className="text-xs text-[#92400E]/80">{t("waitingHint")}</p>
          </div>
        </div>

        <p className="text-center text-xs text-[#8C8279]">{t("legalNotice")}</p>
      </CardContent>
    </Card>
  )
}
