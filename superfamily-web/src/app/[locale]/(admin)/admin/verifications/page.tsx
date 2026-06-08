"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  User,
  Clock,
  FileText,
} from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface Verification {
  id: string
  type: string
  status: string
  educator_id: string
  document_url?: string
  created_at: string
  updated_at: string
  educator?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

interface VerificationsResponse {
  data: Verification[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-[#FFF3EE] text-[#C45B3E]" },
  approved: { label: "Approuve", className: "bg-[#E8F5EE] text-[#2E7D52]" },
  rejected: { label: "Rejete", className: "bg-red-50 text-red-600" },
}

export default function VerificationsPage() {
  const queryClient = useQueryClient()

  const { data: response, isLoading } = useQuery<VerificationsResponse>({
    queryKey: ["admin-verifications"],
    queryFn: () => apiGet("/admin/verifications/pending"),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiPatch(`/admin/verifications/${id}`, { action: "approve" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-verifications"] })
      toast.success("Verification approuvee avec succes")
    },
    onError: () => {
      toast.error("Erreur lors de l'approbation")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiPatch(`/admin/verifications/${id}`, {
        action: "reject",
        reason: "Document non conforme",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-verifications"] })
      toast.success("Verification rejetee")
    },
    onError: () => {
      toast.error("Erreur lors du rejet")
    },
  })

  const verifications = response?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Verifications en attente
        </h1>
        <p className="text-sm text-[#8C8279]">
          {verifications.length} dossier{verifications.length > 1 ? "s" : ""} a examiner
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : verifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE]">
            <ShieldCheck className="h-8 w-8 text-[#2E7D52]" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
            Aucune verification en attente
          </h3>
          <p className="mt-1 text-sm text-[#8C8279]">
            Tous les dossiers ont ete traites.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map((v) => {
            const educatorName = v.educator
              ? `${v.educator.first_name} ${v.educator.last_name}`
              : `Educateur #${v.educator_id}`
            const educatorEmail = v.educator?.email ?? ""
            const cfg = statusConfig[v.status] ?? statusConfig.pending

            return (
              <Card key={v.id} className="border-[#E8E4DF] bg-white">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF8F5]">
                        <User className="h-6 w-6 text-[#8C8279]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1A1A1A]">{educatorName}</h3>
                        {educatorEmail && (
                          <p className="text-sm text-[#8C8279]">{educatorEmail}</p>
                        )}
                        <p className="mt-1 text-xs text-[#8C8279]">
                          Soumis le {formatDate(v.created_at, "d MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1 bg-[#2E7D52] text-white hover:bg-[#256943]"
                        onClick={() => approveMutation.mutate(v.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approuver
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => rejectMutation.mutate(v.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rejeter
                      </Button>
                    </div>
                  </div>

                  {/* Verification details */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg border border-[#E8E4DF] bg-[#FAF8F5] px-3 py-2">
                      <FileText className="h-4 w-4 text-[#8C8279]" />
                      <span className="text-xs font-medium text-[#1A1A1A]">
                        Type : {v.type}
                      </span>
                    </div>
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                    {v.document_url && (
                      <a
                        href={v.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-[#2E7D52] hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir le document
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
