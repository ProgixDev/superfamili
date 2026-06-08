"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import {
  FileText,
  Upload,
  Eye,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileUp,
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiDelete } from "@/lib/api/client"
import { apiUpload } from "@/lib/api/upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FeatureConsentModal } from "@/components/consents/feature-consent-modal"
import { useRequiredConsents } from "@/hooks/use-consents"

// ─── Types ──────────────────────────────────────────────────────────────

type DocumentType =
  | "background_check"
  | "birth_certificate"
  | "cpr_certification"
  | "work_authorization"
  | "secondary_id"
  | "diploma"

type DocumentStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "expired"

interface DocumentRow {
  id: string
  educator_id: string
  document_type: DocumentType
  file_url: string
  file_size_bytes: number
  mime_type: string
  status: DocumentStatus
  issued_date: string | null
  expires_at: string | null
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
  signed_url: string | null
}

interface MyDocumentsResponse {
  data?: DocumentRow[]
}

const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
const MAX_BYTES = 10 * 1024 * 1024

/**
 * The documents the educator can provide. Iterating over this
 * list drives the page layout — each card either shows an empty "Upload"
 * state, the most recent row for that type, or every row when multiples
 * are allowed.
 *
 * `requiresIssuedDate` gates the issue-date input in the upload dialog.
 * Only background_check and cpr_certification need it; the others ignore
 * the field if sent.
 */
const DOCUMENT_SPEC: Array<{
  type: DocumentType
  required: boolean
  requiresIssuedDate: boolean
  multiple?: boolean
}> = [
  { type: "background_check", required: true, requiresIssuedDate: true },
  { type: "birth_certificate", required: true, requiresIssuedDate: false },
  { type: "cpr_certification", required: true, requiresIssuedDate: true },
  { type: "work_authorization", required: true, requiresIssuedDate: false },
  { type: "secondary_id", required: false, requiresIssuedDate: false },
  { type: "diploma", required: false, requiresIssuedDate: false, multiple: true },
]

export default function EducatorDocumentsPage() {
  const t = useTranslations("documents")
  const tdt = useTranslations("dateTime")
  const dateLocale = tdt("locale")
  const queryClient = useQueryClient()

  // ─── Fetch current documents ────────────────────────────────────────
  const { data, isLoading, error } = useQuery<MyDocumentsResponse>({
    queryKey: ["documents", "me"],
    queryFn: () => apiGet("/documents/me"),
  })

  const rows = React.useMemo<DocumentRow[]>(() => data?.data ?? [], [data?.data])

  /**
   * Finds the LATEST row of a given type. The backend sorts newest first
   * in `listMine`, so the first match is the current version. Older
   * versions stay in the audit trail but aren't shown on the page.
   */
  const documentsByType = React.useMemo(() => {
    const map = new Map<DocumentType, DocumentRow[]>()
    for (const row of rows) {
      map.set(row.document_type, [...(map.get(row.document_type) ?? []), row])
    }
    return map
  }, [rows])

  const latestByType = React.useMemo(() => {
    const map = new Map<DocumentType, DocumentRow>()
    documentsByType.forEach((documents, type) => {
      if (documents[0]) map.set(type, documents[0])
    })
    return map
  }, [documentsByType])

  // ─── Upload dialog state ────────────────────────────────────────────
  const [uploadTarget, setUploadTarget] = React.useState<
    (typeof DOCUMENT_SPEC)[number] | null
  >(null)

  // ─── Background check consent gate ─────────────────────────────────
  //
  // When the user tries to upload a background_check document, we first
  // check whether they've accepted `background_check_storage`. If not,
  // the click queues the upload target into `pendingBgCheckSpec` and
  // opens the consent modal. On accept, we move the target into
  // `uploadTarget` to open the actual upload dialog.
  const { data: requiredConsents } = useRequiredConsents()
  const [pendingBgCheckSpec, setPendingBgCheckSpec] = React.useState<
    (typeof DOCUMENT_SPEC)[number] | null
  >(null)

  const bgCheckConsentAccepted = React.useMemo(() => {
    if (!requiredConsents) return false
    return (
      requiredConsents.find(
        (c) => c.consent_type === "background_check_storage",
      )?.already_accepted ?? false
    )
  }, [requiredConsents])

  const handleUploadRequest = (spec: (typeof DOCUMENT_SPEC)[number]) => {
    // Non-background-check documents don't need a dedicated consent —
    // the generic terms-of-use + privacy-policy at signup cover them.
    if (spec.type !== "background_check") {
      setUploadTarget(spec)
      return
    }
    // Background check with consent already accepted → straight to the
    // upload dialog.
    if (bgCheckConsentAccepted) {
      setUploadTarget(spec)
      return
    }
    // Otherwise queue it behind the consent modal.
    setPendingBgCheckSpec(spec)
  }

  // ─── Delete dialog state ────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = React.useState<DocumentRow | null>(
    null,
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", "me"] })
      toast.success(t("deleteDialog.successToast"))
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error(t("errors.deleteFailed"))
    },
  })

  // ─── Formatting helpers ────────────────────────────────────────────
  const formatDate = (iso: string | null): string => {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // ─── Render ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">
          {t("errors.loadFailed")}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
      <div data-tour="documents" className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A] md:text-3xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8C8279]">
          {t("pageIntro")}
        </p>
      </div>

      <div className="space-y-4">
        {DOCUMENT_SPEC.map((spec) => {
          const current = latestByType.get(spec.type)
          const documentsForType = documentsByType.get(spec.type) ?? []

          if (spec.multiple) {
            return (
              <MultiDocumentCard
                key={spec.type}
                spec={spec}
                documents={documentsForType}
                formatDate={formatDate}
                onUpload={() => handleUploadRequest(spec)}
                onDelete={(row) => setDeleteTarget(row)}
                isLoading={isLoading}
              />
            )
          }

          return (
            <DocumentCard
              key={spec.type}
              spec={spec}
              current={current}
              formatDate={formatDate}
              onUpload={() => handleUploadRequest(spec)}
              onDelete={(row) => setDeleteTarget(row)}
              isLoading={isLoading}
            />
          )
        })}
      </div>

      {/* Upload dialog — one dialog used by all document cards. */}
      {uploadTarget && (
        <UploadDialog
          spec={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["documents", "me"] })
            setUploadTarget(null)
          }}
        />
      )}

      {/* Delete confirmation dialog. */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
            <DialogDescription>{t("deleteDialog.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-[#E8E4DF]"
            >
              {t("uploadDialog.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("deleteButton")}
                </>
              ) : (
                t("deleteDialog.confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Background check consent gate. Opens when the user clicks
          "Upload" on the background_check card without having accepted
          the storage consent. On accept → opens the actual upload
          dialog. On cancel → returns to the page unchanged. */}
      <FeatureConsentModal
        consentType="background_check_storage"
        open={pendingBgCheckSpec !== null}
        onClose={() => setPendingBgCheckSpec(null)}
        onAccepted={() => {
          const spec = pendingBgCheckSpec
          setPendingBgCheckSpec(null)
          if (spec) setUploadTarget(spec)
        }}
      />
    </div>
  )
}

// ─── DocumentCard — one per document type ─────────────────────────────

function DocumentCard({
  spec,
  current,
  formatDate,
  onUpload,
  onDelete,
  isLoading,
}: {
  spec: (typeof DOCUMENT_SPEC)[number]
  current: DocumentRow | undefined
  formatDate: (iso: string | null) => string
  onUpload: () => void
  onDelete: (row: DocumentRow) => void
  isLoading: boolean
}) {
  const t = useTranslations("documents")
  const typeKey = `types.${spec.type}` as const

  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />
  }

  // ── Status icon + color ───────────────────────────────────────────
  let statusIcon = <FileText className="h-5 w-5 text-[#8C8279]" />
  let statusDot = "⚪"
  let statusText = t("status.not_uploaded")
  let cardBg = "bg-[#FAF8F5]"
  let cardBorder = "border-[#E8E4DF]"

  if (current) {
    switch (current.status) {
      case "approved":
        statusIcon = <CheckCircle2 className="h-5 w-5 text-[#2E7D52]" />
        statusDot = "🟢"
        statusText = t("status.approved")
        cardBg = "bg-[#E8F5EE]"
        cardBorder = "border-[#2E7D52]/30"
        break
      case "pending_review":
        statusIcon = <Clock className="h-5 w-5 text-[#F59E0B]" />
        statusDot = "🟡"
        statusText = t("status.pending_review")
        cardBg = "bg-[#FFFBEB]"
        cardBorder = "border-[#F59E0B]/30"
        break
      case "rejected":
        statusIcon = <XCircle className="h-5 w-5 text-red-600" />
        statusDot = "🔴"
        statusText = t("status.rejected")
        cardBg = "bg-red-50"
        cardBorder = "border-red-200"
        break
      case "expired":
        statusIcon = <AlertCircle className="h-5 w-5 text-red-600" />
        statusDot = "🔴"
        statusText = t("status.expired")
        cardBg = "bg-red-50"
        cardBorder = "border-red-200"
        break
    }
  }

  return (
    <Card className={`${cardBg} ${cardBorder} border`}>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="mt-0.5">{statusIcon}</div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#1A1A1A]">
                <span className="mr-1" aria-hidden>
                  {statusDot}
                </span>
                {t(`${typeKey}.label`)}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  spec.required
                    ? "bg-[#E8E4DF] text-[#1A1A1A]"
                    : "bg-[#FAF8F5] text-[#8C8279]"
                }`}
              >
                {spec.required ? t("required") : t("optional")}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#8C8279]">
              {t(`${typeKey}.description`)}
            </p>

            <p className="mt-2 text-sm font-medium text-[#1A1A1A]">
              {statusText}
            </p>

            {current?.issued_date && (
              <p className="text-xs text-[#8C8279]">
                {t("issuedOn", { date: formatDate(current.issued_date) })}
              </p>
            )}
            {current?.expires_at && (
              <p className="text-xs text-[#8C8279]">
                {t("expiresOn", { date: formatDate(current.expires_at) })}
              </p>
            )}
            {current?.status === "rejected" && current.rejection_reason && (
              <p className="mt-1 text-xs text-red-700">
                {t("rejectionReason", { reason: current.rejection_reason })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:flex-col">
            {current?.signed_url && (
              <a
                href={current.signed_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DF] bg-white px-3 py-2 text-xs font-medium text-[#1A1A1A] transition-colors hover:bg-[#FAF8F5]"
              >
                <Eye className="h-3.5 w-3.5" />
                {t("viewButton")}
              </a>
            )}

            {/* Upload button — also used for "replace" when rejected/expired */}
            {(current === undefined ||
              current.status === "rejected" ||
              current.status === "expired") && (
              <Button
                size="sm"
                onClick={onUpload}
                className="gap-1 bg-[#2E7D52] text-white hover:bg-[#256943]"
              >
                <Upload className="h-3.5 w-3.5" />
                {current === undefined
                  ? t("uploadButton")
                  : t("replaceButton")}
              </Button>
            )}

            {/* Delete button — only available for pending_review rows */}
            {current?.status === "pending_review" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(current)}
                className="gap-1 border-[#E8E4DF] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("deleteButton")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── MultiDocumentCard — optional repeatable types like diplomas ──────

function MultiDocumentCard({
  spec,
  documents,
  formatDate,
  onUpload,
  onDelete,
  isLoading,
}: {
  spec: (typeof DOCUMENT_SPEC)[number]
  documents: DocumentRow[]
  formatDate: (iso: string | null) => string
  onUpload: () => void
  onDelete: (row: DocumentRow) => void
  isLoading: boolean
}) {
  const t = useTranslations("documents")
  const typeKey = `types.${spec.type}` as const

  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />
  }

  return (
    <Card className="border border-[#E8E4DF] bg-[#FAF8F5]">
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="mt-0.5">
            <FileText className="h-5 w-5 text-[#8C8279]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#1A1A1A]">
                {t(`${typeKey}.label`)}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#8C8279]">
                {t("optional")}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#8C8279]">
              {t(`${typeKey}.description`)}
            </p>
            {documents.length === 0 && (
              <p className="mt-2 text-sm font-medium text-[#1A1A1A]">
                {t("status.not_uploaded")}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={onUpload}
            className="gap-1 bg-[#2E7D52] text-white hover:bg-[#256943]"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("addFileButton")}
          </Button>
        </div>

        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((document, index) => (
              <div
                key={document.id}
                className="rounded-xl border border-[#E8E4DF] bg-white p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {t("fileCount", { count: index + 1 })}
                    </p>
                    <DocumentStatusLine status={document.status} />
                    {document.issued_date && (
                      <p className="text-xs text-[#8C8279]">
                        {t("issuedOn", {
                          date: formatDate(document.issued_date),
                        })}
                      </p>
                    )}
                    {document.expires_at && (
                      <p className="text-xs text-[#8C8279]">
                        {t("expiresOn", {
                          date: formatDate(document.expires_at),
                        })}
                      </p>
                    )}
                    {document.status === "rejected" &&
                      document.rejection_reason && (
                        <p className="mt-1 text-xs text-red-700">
                          {t("rejectionReason", {
                            reason: document.rejection_reason,
                          })}
                        </p>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {document.signed_url && (
                      <a
                        href={document.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DF] bg-white px-3 py-2 text-xs font-medium text-[#1A1A1A] transition-colors hover:bg-[#FAF8F5]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("viewButton")}
                      </a>
                    )}
                    {document.status === "pending_review" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(document)}
                        className="gap-1 border-[#E8E4DF] text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("deleteButton")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DocumentStatusLine({ status }: { status: DocumentStatus }) {
  const t = useTranslations("documents")

  const config: Record<
    DocumentStatus,
    { icon: React.ReactNode; label: string }
  > = {
    approved: {
      icon: <CheckCircle2 className="h-4 w-4 text-[#2E7D52]" />,
      label: t("status.approved"),
    },
    pending_review: {
      icon: <Clock className="h-4 w-4 text-[#F59E0B]" />,
      label: t("status.pending_review"),
    },
    rejected: {
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      label: t("status.rejected"),
    },
    expired: {
      icon: <AlertCircle className="h-4 w-4 text-red-600" />,
      label: t("status.expired"),
    },
  }

  const current = config[status]

  return (
    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A]">
      {current.icon}
      {current.label}
    </p>
  )
}

// ─── UploadDialog ─────────────────────────────────────────────────────

function UploadDialog({
  spec,
  onClose,
  onSuccess,
}: {
  spec: (typeof DOCUMENT_SPEC)[number]
  onClose: () => void
  onSuccess: () => void
}) {
  const t = useTranslations("documents")
  const [file, setFile] = React.useState<File | null>(null)
  const [issuedDate, setIssuedDate] = React.useState("")
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [dateError, setDateError] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [percent, setPercent] = React.useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const picked = e.target.files?.[0] ?? null
    if (!picked) {
      setFile(null)
      return
    }
    if (picked.size > MAX_BYTES) {
      setFileError(t("uploadDialog.fileTooLarge"))
      setFile(null)
      return
    }
    if (!(ACCEPTED_MIME as readonly string[]).includes(picked.type)) {
      setFileError(t("uploadDialog.fileBadType"))
      setFile(null)
      return
    }
    setFile(picked)
  }

  const handleSubmit = async () => {
    if (!file) {
      setFileError(t("uploadDialog.fileRequired"))
      return
    }
    if (spec.requiresIssuedDate && !issuedDate) {
      setDateError(t("uploadDialog.issuedDateRequired"))
      return
    }

    setUploading(true)
    setPercent(0)

    try {
      await apiUpload("/documents/upload", file, {
        fields: {
          type: spec.type,
          issued_date: spec.requiresIssuedDate ? issuedDate : undefined,
        },
        onProgress: (p) => setPercent(p.percent),
      })
      toast.success(t("uploadDialog.successToast"))
      onSuccess()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.uploadFailed")
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const typeKey = `types.${spec.type}.label` as const

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("uploadDialog.title", { type: t(typeKey) })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("uploadDialog.fileLabel")}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 border-[#E8E4DF]"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <FileUp className="h-4 w-4" />
              <span className="truncate">
                {file ? file.name : t("uploadDialog.filePlaceholder")}
              </span>
            </Button>
            {fileError && (
              <p className="text-xs text-red-600">{fileError}</p>
            )}
          </div>

          {spec.requiresIssuedDate && (
            <div className="space-y-2">
              <Label htmlFor="issued_date">
                {t("uploadDialog.issuedDateLabel")}
              </Label>
              <Input
                id="issued_date"
                type="date"
                value={issuedDate}
                onChange={(e) => {
                  setIssuedDate(e.target.value)
                  if (dateError) setDateError(null)
                }}
                max={new Date().toISOString().split("T")[0]}
                className="border-[#E8E4DF]"
                disabled={uploading}
              />
              <p className="text-xs text-[#8C8279]">
                {t("uploadDialog.issuedDateHint")}
              </p>
              {dateError && <p className="text-xs text-red-600">{dateError}</p>}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8E4DF]">
                <div
                  className="h-full bg-[#2E7D52] transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-center text-xs text-[#8C8279]">
                {t("uploadDialog.uploading", { percent })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploading}
            className="border-[#E8E4DF]"
          >
            {t("uploadDialog.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !file}
            className="bg-[#2E7D52] text-white hover:bg-[#256943]"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("uploadDialog.uploading", { percent })}
              </>
            ) : (
              t("uploadDialog.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
