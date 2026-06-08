"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  MessageCircle,
  Clock,
  CheckCircle,
  Eye,
  FileText,
} from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface Dispute {
  id: string
  booking_id: string
  category: string
  subject: string
  description: string
  status: string
  resolution_notes?: string
  resolution_type?: string
  created_at: string
  updated_at: string
  booking?: {
    id: string
    amount_cents?: number
    parent?: {
      first_name: string
      last_name: string
    }
    educator?: {
      first_name: string
      last_name: string
    }
  }
}

interface DisputesResponse {
  data: Dispute[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Ouvert", className: "bg-red-50 text-red-600" },
  in_review: { label: "En examen", className: "bg-[#FFF3EE] text-[#C45B3E]" },
  resolved: { label: "Resolu", className: "bg-[#E8F5EE] text-[#2E7D52]" },
  closed: { label: "Ferme", className: "bg-[#FAF8F5] text-[#8C8279]" },
}

export default function LitigesPage() {
  const queryClient = useQueryClient()

  const { data: response, isLoading } = useQuery<DisputesResponse>({
    queryKey: ["admin-disputes"],
    queryFn: () => apiGet("/admin/disputes"),
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      apiPatch(`/admin/disputes/${id}/resolve`, {
        resolution_notes: "Resolu",
        resolution_type: "resolved",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] })
      toast.success("Litige resolu avec succes")
    },
    onError: () => {
      toast.error("Erreur lors de la resolution du litige")
    },
  })

  const disputes = response?.data ?? []

  const openCount = disputes.filter(
    (d) => d.status === "open" || d.status === "in_review"
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">Litiges</h1>
        <p className="text-sm text-[#8C8279]">
          {openCount > 0
            ? `${openCount} litige${openCount > 1 ? "s" : ""} en cours`
            : "Aucun litige en cours"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE]">
            <CheckCircle className="h-8 w-8 text-[#2E7D52]" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
            Aucun litige
          </h3>
          <p className="mt-1 text-sm text-[#8C8279]">
            Tous les litiges ont ete resolus.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const cfg = statusConfig[dispute.status] ?? {
              label: dispute.status,
              className: "bg-[#FAF8F5] text-[#8C8279]",
            }
            const parentName = dispute.booking?.parent
              ? `${dispute.booking.parent.first_name} ${dispute.booking.parent.last_name}`
              : ""
            const educatorName = dispute.booking?.educator
              ? `${dispute.booking.educator.first_name} ${dispute.booking.educator.last_name}`
              : ""
            const bookingAmount = dispute.booking?.amount_cents
              ? formatCurrency(dispute.booking.amount_cents / 100)
              : ""

            return (
              <Card key={dispute.id} className="border-[#E8E4DF] bg-white">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#1A1A1A]">
                            {dispute.subject || `Litige #${dispute.id.slice(0, 8)}`}
                          </h3>
                          <Badge className={cfg.className}>{cfg.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-[#8C8279]">
                          Reservation #{dispute.booking_id?.slice(0, 8) ?? "--"}
                          {bookingAmount ? ` -- ${bookingAmount}` : ""}
                        </p>
                        {(parentName || educatorName) && (
                          <p className="mt-1 text-sm text-[#8C8279]">
                            {parentName}{parentName && educatorName ? " vs " : ""}{educatorName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 border-[#E8E4DF]">
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 border-[#E8E4DF]">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Contacter
                      </Button>
                      {(dispute.status === "open" || dispute.status === "in_review") && (
                        <Button
                          size="sm"
                          className="gap-1 bg-[#2E7D52] text-white hover:bg-[#256943]"
                          onClick={() => resolveMutation.mutate(dispute.id)}
                          disabled={resolveMutation.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Resoudre
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-[#FAF8F5] p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#8C8279]" />
                      <p className="text-xs font-semibold text-[#1A1A1A]">
                        Categorie : {dispute.category || "--"}
                      </p>
                    </div>
                    {dispute.description && (
                      <p className="mt-1 text-sm text-[#8C8279]">{dispute.description}</p>
                    )}
                    <p className="mt-2 flex items-center gap-1 text-xs text-[#8C8279]">
                      <Clock className="h-3 w-3" />
                      Soumis le {formatDate(dispute.created_at, "d MMM yyyy")}
                    </p>
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
