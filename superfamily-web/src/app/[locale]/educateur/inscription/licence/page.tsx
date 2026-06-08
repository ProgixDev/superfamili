"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import {
  Loader2,
  FileUp,
  Info,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/api/client"
import { apiUpload } from "@/lib/api/upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Choice = "yes" | "no" | null

interface EducatorProfileResponse {
  data?: {
    id: string
    license_status?: "none" | "pending" | "approved" | "rejected"
    license_rejection_reason?: string | null
  }
  id?: string
  license_status?: "none" | "pending" | "approved" | "rejected"
  license_rejection_reason?: string | null
}

const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export default function LicenseUploadPage() {
  const t = useTranslations("license")
  const tc = useTranslations("common")
  const router = useRouter()

  // Load the current educator profile to show the status banner when the
  // educator comes back to re-upload after a rejection.
  const { data: profileResp, isLoading: profileLoading } =
    useQuery<EducatorProfileResponse>({
      queryKey: ["educator-profile"],
      queryFn: () => apiGet("/educators/me"),
    })

  const educatorProfile = profileResp?.data ?? (profileResp as any)
  const currentStatus: EducatorProfileResponse["license_status"] =
    educatorProfile?.license_status ?? "none"
  const rejectionReason = educatorProfile?.license_rejection_reason

  const [choice, setChoice] = React.useState<Choice>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const picked = e.target.files?.[0] ?? null
    if (!picked) {
      setFile(null)
      return
    }
    if (picked.size > MAX_BYTES) {
      setFileError(t("errorTooLarge"))
      setFile(null)
      return
    }
    if (!ACCEPTED_MIME.includes(picked.type)) {
      setFileError(t("errorBadType"))
      setFile(null)
      return
    }
    setFile(picked)
  }

  async function submitWithLicense() {
    if (!file) {
      setFileError(t("errorNoFile"))
      return
    }

    setUploading(true)
    setFileError(null)

    try {
      await apiUpload("/educators/me/license", file, {
        fields: { hasLicense: "true" },
      })

      toast.success(t("successSubmitted"))
      router.push("/educateur/tableau-de-bord")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorUpload"))
    } finally {
      setUploading(false)
      setSubmitting(false)
    }
  }

  async function submitWithoutLicense() {
    setSubmitting(true)
    try {
      await apiPost("/educators/me/license", { hasLicense: false })
      toast.success(t("successNoLicense"))
      router.push("/educateur/tableau-de-bord")
    } catch {
      toast.error(t("errorSubmit"))
    } finally {
      setSubmitting(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2E7D52]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-16">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F5EE]">
          <ShieldCheck className="h-7 w-7 text-[#2E7D52]" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A] md:text-3xl">
          {t("pageTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#8C8279]">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Current status banner (only if re-visiting) */}
      {currentStatus === "pending" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" />
          <p className="text-sm text-[#92400E]">{t("statusPending")}</p>
        </div>
      )}
      {currentStatus === "approved" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#2E7D52]/30 bg-[#E8F5EE] p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2E7D52]" />
          <p className="text-sm text-[#1B5E38]">{t("statusApproved")}</p>
        </div>
      )}
      {currentStatus === "rejected" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">{t("statusRejected")}</p>
            {rejectionReason && (
              <p className="mt-1">
                {t("statusRejectedReason", { reason: rejectionReason })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Question + choice */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-bold text-[#1A1A1A]">
            {t("question")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setChoice("yes")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                choice === "yes"
                  ? "border-[#2E7D52] bg-[#E8F5EE]"
                  : "border-[#E8E4DF] bg-[#FAF8F5] hover:border-[#2E7D52]/50"
              }`}
            >
              <div
                className={`font-semibold ${
                  choice === "yes" ? "text-[#2E7D52]" : "text-[#1A1A1A]"
                }`}
              >
                {t("yes")}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setChoice("no")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                choice === "no"
                  ? "border-[#2E7D52] bg-[#E8F5EE]"
                  : "border-[#E8E4DF] bg-[#FAF8F5] hover:border-[#2E7D52]/50"
              }`}
            >
              <div
                className={`font-semibold ${
                  choice === "no" ? "text-[#2E7D52]" : "text-[#1A1A1A]"
                }`}
              >
                {t("no")}
              </div>
            </button>
          </div>

          {/* Upload step (only when "yes") */}
          {choice === "yes" && (
            <div className="mt-6 space-y-4 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4">
              <div>
                <p className="font-semibold text-[#1A1A1A]">
                  {t("uploadTitle")}
                </p>
                <p className="mt-1 text-sm text-[#8C8279]">
                  {t("uploadHelp")}
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFilePick}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 border-[#E8E4DF]"
                disabled={uploading || submitting}
              >
                <FileUp className="h-4 w-4" />
                {file ? t("uploadButtonReplace") : t("uploadButton")}
              </Button>

              {file && (
                <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <FileUp className="h-4 w-4 text-[#2E7D52]" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-[#8C8279]">
                    ({(file.size / 1024 / 1024).toFixed(1)} Mo)
                  </span>
                </div>
              )}

              <p className="text-xs text-[#8C8279]">{t("uploadHint")}</p>

              {fileError && (
                <p className="text-sm text-red-600">{fileError}</p>
              )}

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={submitWithLicense}
                  disabled={!file || uploading || submitting}
                  className="w-full gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("uploading")}
                    </>
                  ) : submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("submit")
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Confirm step (only when "no") */}
          {choice === "no" && (
            <div className="mt-6 space-y-4 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4">
              <p className="text-sm text-[#1A1A1A]">{t("statusNone")}</p>
              <Button
                type="button"
                onClick={submitWithoutLicense}
                disabled={submitting}
                className="w-full gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submitWithoutLicense")
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-[#8C8279]">
        {t("legalNotice")}
      </p>

      {/* Skip / back link for users who landed here mid-onboarding and want
          to come back to the dashboard first. */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => router.push("/educateur/tableau-de-bord")}
          className="text-sm text-[#8C8279] underline-offset-2 hover:text-[#1A1A1A] hover:underline"
        >
          {tc("back")}
        </button>
      </div>
    </div>
  )
}
