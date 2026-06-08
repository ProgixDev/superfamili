"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── Types ─────────────────────────────────────────────────────────────

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

interface AdminDocumentRow {
  id: string
  document_type: DocumentType
  status: DocumentStatus
  issued_date: string | null
  expires_at: string | null
  created_at: string
  signed_url: string | null
  educator_profiles: {
    id: string
    profile_id: string
    profiles: {
      first_name: string
      last_name: string
      email: string
    }
  }
}

interface AdminDocumentsResponse {
  data: AdminDocumentRow[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type DialogMode =
  | { kind: "closed" }
  | { kind: "review"; row: AdminDocumentRow }

const TYPES: DocumentType[] = [
  "background_check",
  "birth_certificate",
  "cpr_certification",
  "work_authorization",
  "secondary_id",
  "diploma",
]

export default function AdminDocumentsPage() {
  const t = useTranslations("adminDocuments")
  const td = useTranslations("documents")
  const tdt = useTranslations("dateTime")
  const dateLocale = tdt("locale")
  const queryClient = useQueryClient()

  // ─── Filters ───────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] =
    React.useState<DocumentStatus>("pending_review")
  const [typeFilter, setTypeFilter] = React.useState<DocumentType | "all">(
    "all",
  )

  // ─── Review dialog state ───────────────────────────────────────────
  const [dialog, setDialog] = React.useState<DialogMode>({ kind: "closed" })
  const [rejectReason, setRejectReason] = React.useState("")
  const [rejectError, setRejectError] = React.useState<string | null>(null)

  // ─── Fetch list ────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<AdminDocumentsResponse>({
    queryKey: ["admin", "documents", statusFilter, typeFilter],
    queryFn: () => {
      const params: Record<string, string> = { status: statusFilter }
      if (typeFilter !== "all") params.type = typeFilter
      return apiGet("/admin/documents", params)
    },
  })

  // ─── Mutations ─────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiPatch(`/admin/documents/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] })
      toast.success(t("dialog.approvedToast"))
      setDialog({ kind: "closed" })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Error")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiPatch(`/admin/documents/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] })
      toast.success(t("dialog.rejectedToast"))
      setDialog({ kind: "closed" })
      setRejectReason("")
      setRejectError(null)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Error")
    },
  })

  // ─── Helpers ───────────────────────────────────────────────────────
  const formatDate = (iso: string | null) => {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const typeLabel = (type: DocumentType) => {
    return td(`types.${type}.label`)
  }

  const handleReject = () => {
    if (dialog.kind !== "review") return
    const trimmed = rejectReason.trim()
    if (trimmed.length === 0) {
      setRejectError(t("dialog.rejectReasonRequired"))
      return
    }
    rejectMutation.mutate({ id: dialog.row.id, reason: trimmed })
  }

  const rows = data?.data ?? []

  // ─── Group rows by educator ─────────────────────────────────────────
  // The flat list mixed documents from different educators together,
  // which made it easy to review the wrong person's file. Group by
  // educator profile id so each reviewer sees one collapsible row per
  // educator and a dropdown of just their pending docs.
  interface EducatorGroup {
    key: string
    name: string
    email: string
    documents: AdminDocumentRow[]
  }

  const groups: EducatorGroup[] = React.useMemo(() => {
    const map = new Map<string, EducatorGroup>()
    for (const row of rows) {
      const ep = row.educator_profiles
      // Prefer the educator profile id; fall back to profile_id, then to
      // a synthetic key per orphaned row so they don't collapse together.
      const key =
        ep?.id ?? ep?.profile_id ?? `unknown-${row.id}`
      const profile = ep?.profiles
      const name = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "—"
        : "—"
      const email = profile?.email ?? ""
      const existing = map.get(key)
      if (existing) {
        existing.documents.push(row)
      } else {
        map.set(key, { key, name, email, documents: [row] })
      }
    }
    // Sort groups by educator name for predictable ordering.
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [rows])

  // Track which educator rows are expanded. A Set keeps toggling cheap
  // and lets us preserve open state across re-renders without re-fetching.
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // When the underlying filter changes the visible groups also change;
  // collapse anything that no longer exists so stale ids don't linger.
  React.useEffect(() => {
    setExpanded((prev) => {
      const visible = new Set(groups.map((g) => g.key))
      let changed = false
      const next = new Set<string>()
      for (const key of prev) {
        if (visible.has(key)) next.add(key)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [groups])

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EE]">
          <FileText className="h-5 w-5 text-[#2E7D52]" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {t("pageTitle")}
          </h1>
          <p className="text-sm text-[#8C8279]">{t("pageSubtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8C8279]">
                {t("filters.statusLabel")}
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => v && setStatusFilter(v as DocumentStatus)}
              >
                <SelectTrigger className="border-[#E8E4DF]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_review">
                    {t("filters.statusPending")}
                  </SelectItem>
                  <SelectItem value="approved">
                    {t("filters.statusApproved")}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {t("filters.statusRejected")}
                  </SelectItem>
                  <SelectItem value="expired">
                    {t("filters.statusExpired")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8C8279]">
                {t("filters.typeLabel")}
              </label>
              <Select
                value={typeFilter}
                onValueChange={(v) => v && setTypeFilter(v as DocumentType | "all")}
              >
                <SelectTrigger className="border-[#E8E4DF]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.typeAll")}</SelectItem>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {typeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="font-heading text-base font-bold text-[#1A1A1A]">
            {data?.meta?.total ?? 0}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F5]">
                <FileText className="h-6 w-6 text-[#8C8279]" />
              </div>
              <p className="text-sm text-[#8C8279]">{t("empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const isOpen = expanded.has(group.key)
                const count = group.documents.length
                return (
                  <div
                    key={group.key}
                    className="overflow-hidden rounded-xl border border-[#E8E4DF] bg-white"
                  >
                    {/* Educator header — clicking it expands/collapses
                        the document list for just this educator. */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.key)}
                      aria-expanded={isOpen}
                      aria-controls={`docs-${group.key}`}
                      className="flex w-full items-center gap-3 bg-[#FAF8F5] px-4 py-3 text-left transition-colors hover:bg-[#F1ECE6]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-[#2E7D52]">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#1A1A1A]">
                          {group.name}
                        </p>
                        {group.email && (
                          <p className="truncate text-sm text-[#8C8279]">
                            {group.email}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2E7D52] ring-1 ring-[#E8E4DF]">
                        {count}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[#8C8279]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#8C8279]" />
                      )}
                    </button>

                    {/* Per-educator documents — only rendered when
                        expanded so the page stays scannable. */}
                    {isOpen && (
                      <div
                        id={`docs-${group.key}`}
                        className="divide-y divide-[#E8E4DF] bg-white"
                      >
                        {group.documents.map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[#1A1A1A]">
                                {typeLabel(row.document_type)}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8C8279]">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(row.created_at)}
                                </span>
                                {row.issued_date && (
                                  <span>
                                    {td("issuedOn", {
                                      date: formatDate(row.issued_date),
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => {
                                setDialog({ kind: "review", row })
                                setRejectReason("")
                                setRejectError(null)
                              }}
                              className="shrink-0 bg-[#2E7D52] text-white hover:bg-[#256943]"
                            >
                              {t("reviewButton")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review dialog */}
      <Dialog
        open={dialog.kind === "review"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog({ kind: "closed" })
            setRejectReason("")
            setRejectError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "review" &&
                `${dialog.row.educator_profiles.profiles.first_name} ${dialog.row.educator_profiles.profiles.last_name}`}
            </DialogDescription>
          </DialogHeader>

          {dialog.kind === "review" && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4">
                <span className="font-medium text-[#8C8279]">
                  {t("dialog.typeLabel")}
                </span>
                <span className="text-[#1A1A1A]">
                  {typeLabel(dialog.row.document_type)}
                </span>

                {dialog.row.issued_date && (
                  <>
                    <span className="font-medium text-[#8C8279]">
                      {t("dialog.issuedDateLabel")}
                    </span>
                    <span className="text-[#1A1A1A]">
                      {formatDate(dialog.row.issued_date)}
                    </span>
                  </>
                )}

                {dialog.row.expires_at && (
                  <>
                    <span className="font-medium text-[#8C8279]">
                      {t("dialog.expiresAtLabel")}
                    </span>
                    <span className="text-[#1A1A1A]">
                      {formatDate(dialog.row.expires_at)}
                    </span>
                  </>
                )}
              </div>

              {dialog.row.signed_url && (
                <a
                  href={dialog.row.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DF] bg-white px-3 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#FAF8F5]"
                >
                  <FileText className="h-4 w-4" />
                  {t("dialog.openFile")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <div className="space-y-2 pt-2">
                <label className="block text-sm font-medium text-[#1A1A1A]">
                  {t("dialog.rejectReasonLabel")}
                </label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value)
                    if (rejectError) setRejectError(null)
                  }}
                  placeholder={t("dialog.rejectReasonPlaceholder")}
                  className="min-h-20 border-[#E8E4DF]"
                  rows={3}
                />
                {rejectError && (
                  <p className="text-xs text-red-600">{rejectError}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialog({ kind: "closed" })
                setRejectReason("")
                setRejectError(null)
              }}
              className="border-[#E8E4DF]"
            >
              {t("dialog.cancel")}
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("dialog.rejecting")}
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("dialog.reject")}
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                if (dialog.kind === "review") {
                  approveMutation.mutate(dialog.row.id)
                }
              }}
              disabled={approveMutation.isPending}
              className="bg-[#2E7D52] text-white hover:bg-[#256943]"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("dialog.approving")}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("dialog.approve")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
