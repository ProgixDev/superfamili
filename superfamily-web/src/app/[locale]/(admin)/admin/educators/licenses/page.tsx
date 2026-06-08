"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PendingLicense {
  id: string // educator_profile_id
  profile_id: string
  license_status: "pending"
  license_document_url: string | null
  license_document_signed_url: string | null
  license_submitted_at: string | null
  profiles: {
    first_name: string
    last_name: string
    email: string
  }
}

interface PendingLicensesResponse {
  data: PendingLicense[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type DialogMode =
  | { kind: "closed" }
  | { kind: "approve"; row: PendingLicense }
  | { kind: "reject"; row: PendingLicense }

export default function AdminLicensesPage() {
  const t = useTranslations("license.admin")
  const tdt = useTranslations("dateTime")
  const dateLocale = tdt("locale")
  const queryClient = useQueryClient()

  const [dialog, setDialog] = React.useState<DialogMode>({ kind: "closed" })
  const [rejectReason, setRejectReason] = React.useState("")
  const [rejectError, setRejectError] = React.useState<string | null>(null)

  const { data: response, isLoading } = useQuery<PendingLicensesResponse>({
    queryKey: ["admin-pending-licenses"],
    queryFn: () => apiGet("/admin/educators/licenses/pending"),
  })

  const approveMutation = useMutation({
    mutationFn: (educatorProfileId: string) =>
      apiPatch(`/admin/educators/licenses/${educatorProfileId}`, {
        action: "approve",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-licenses"] })
      toast.success(t("approved"))
      setDialog({ kind: "closed" })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({
      educatorProfileId,
      reason,
    }: {
      educatorProfileId: string
      reason: string
    }) =>
      apiPatch(`/admin/educators/licenses/${educatorProfileId}`, {
        action: "reject",
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-licenses"] })
      toast.success(t("rejected"))
      setDialog({ kind: "closed" })
      setRejectReason("")
      setRejectError(null)
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error")
    },
  })

  const rows = response?.data ?? []

  function formatDate(iso: string | null): string {
    if (!iso) return "--"
    return new Date(iso).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function handleRejectSubmit() {
    if (dialog.kind !== "reject") return
    const trimmed = rejectReason.trim()
    if (trimmed.length === 0) {
      setRejectError(t("rejectReasonRequired"))
      return
    }
    rejectMutation.mutate({
      educatorProfileId: dialog.row.id,
      reason: trimmed,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EE]">
          <ShieldCheck className="h-5 w-5 text-[#2E7D52]" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {t("pageTitle")}
          </h1>
          <p className="text-sm text-[#8C8279]">{t("pageSubtitle")}</p>
        </div>
      </div>

      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="font-heading text-base font-bold text-[#1A1A1A]">
            {response?.meta?.total ?? 0}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F5]">
                <ShieldCheck className="h-6 w-6 text-[#8C8279]" />
              </div>
              <p className="text-sm text-[#8C8279]">{t("empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const name =
                  `${row.profiles?.first_name || ""} ${row.profiles?.last_name || ""}`.trim() ||
                  "—"
                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1A1A1A]">{name}</p>
                      <p className="text-sm text-[#8C8279]">
                        {row.profiles?.email}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-[#8C8279]">
                        <Clock className="h-3.5 w-3.5" />
                        {t("columnSubmitted")}: {formatDate(row.license_submitted_at)}
                      </div>
                    </div>

                    {row.license_document_signed_url ? (
                      <a
                        href={row.license_document_signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DF] bg-white px-3 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#FAF8F5]"
                      >
                        <FileText className="h-4 w-4" />
                        {t("viewDocument")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#8C8279]">—</span>
                    )}

                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        onClick={() => setDialog({ kind: "approve", row })}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="bg-[#2E7D52] text-white hover:bg-[#256943]"
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {t("approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDialog({ kind: "reject", row })
                          setRejectReason("")
                          setRejectError(null)
                        }}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="border-[#E8E4DF] text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        {t("reject")}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve confirmation dialog */}
      <Dialog
        open={dialog.kind === "approve"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("approveConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("approveConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ kind: "closed" })}
              className="border-[#E8E4DF]"
            >
              {/* Cancel */}
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (dialog.kind === "approve") {
                  approveMutation.mutate(dialog.row.id)
                }
              }}
              disabled={approveMutation.isPending}
              className="bg-[#2E7D52] text-white hover:bg-[#256943]"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("approving")}
                </>
              ) : (
                t("approve")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={dialog.kind === "reject"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog({ kind: "closed" })
            setRejectReason("")
            setRejectError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rejectConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("rejectConfirmBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value)
                if (rejectError) setRejectError(null)
              }}
              placeholder={t("rejectReasonPlaceholder")}
              className="min-h-24 border-[#E8E4DF]"
              rows={4}
            />
            {rejectError && (
              <p className="text-sm text-red-600">{rejectError}</p>
            )}
          </div>
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
              Annuler
            </Button>
            <Button
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("rejecting")}
                </>
              ) : (
                t("reject")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
