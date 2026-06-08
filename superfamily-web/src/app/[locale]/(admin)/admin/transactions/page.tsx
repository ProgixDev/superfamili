"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  DollarSign,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
} from "lucide-react"
import { apiGet } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Transaction {
  id: string
  booking_id: string
  stripe_payment_intent_id: string
  amount_cents: number
  status: string
  created_at: string
  bookings?: {
    id: string
    start_time?: string
    end_time?: string
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

interface TransactionsResponse {
  data: Transaction[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: "Complete", className: "bg-[#E8F5EE] text-[#2E7D52]" },
  succeeded: { label: "Complete", className: "bg-[#E8F5EE] text-[#2E7D52]" },
  pending: { label: "En attente", className: "bg-[#FFF3EE] text-[#C45B3E]" },
  refunded: { label: "Rembourse", className: "bg-red-50 text-red-600" },
  failed: { label: "Echoue", className: "bg-red-50 text-red-600" },
}

export default function TransactionsPage() {
  const [page, setPage] = React.useState(1)
  const [statusFilter, setStatusFilter] = React.useState("")
  const limit = 20

  const queryParams: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  }
  if (statusFilter) queryParams.status = statusFilter

  const { data: response, isLoading } = useQuery<TransactionsResponse>({
    queryKey: ["admin-transactions", page, limit, statusFilter],
    queryFn: () => apiGet("/admin/transactions", queryParams),
  })

  const transactions = response?.data ?? []
  const meta = response?.meta

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Transactions & Revenus
          </h1>
          <p className="text-sm text-[#8C8279]">
            {meta ? `${meta.total} transaction${meta.total > 1 ? "s" : ""} au total` : "Chargement..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8279]" />
            <select
              className="h-9 rounded-md border border-[#E8E4DF] bg-white pl-9 pr-4 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2E7D52]"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="completed">Completes</option>
              <option value="pending">En attente</option>
              <option value="refunded">Rembourses</option>
              <option value="failed">Echoues</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="overflow-hidden rounded-xl border border-[#E8E4DF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E4DF] bg-[#FAF8F5]">
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">
                  Reservation
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1A1A1A]">
                  Montant
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">
                  Stripe ID
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E8E4DF]">
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-10 rounded" />
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[#8C8279]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="h-8 w-8 text-[#E8E4DF]" />
                      Aucune transaction trouvee
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const cfg = statusConfig[tx.status] ?? {
                    label: tx.status,
                    className: "bg-[#FAF8F5] text-[#8C8279]",
                  }
                  const booking = tx.bookings
                  const parentName = booking?.parent
                    ? `${booking.parent.first_name} ${booking.parent.last_name}`
                    : ""
                  const educatorName = booking?.educator
                    ? `${booking.educator.first_name} ${booking.educator.last_name}`
                    : ""

                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-[#E8E4DF] transition-colors hover:bg-[#FAF8F5]"
                    >
                      <td className="px-4 py-3 font-semibold text-[#1A1A1A]">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-[#8C8279]" />
                          #{tx.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-[#1A1A1A]">
                            Reservation #{tx.booking_id?.slice(0, 8) ?? "--"}
                          </p>
                          {parentName && (
                            <p className="text-xs text-[#8C8279]">
                              {parentName} {educatorName ? `/ ${educatorName}` : ""}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#8C8279]">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(tx.created_at, "d MMM yyyy")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1A1A1A]">
                        {formatCurrency(tx.amount_cents / 100)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[#8C8279]">
                          {tx.stripe_payment_intent_id
                            ? tx.stripe_payment_intent_id.slice(0, 16) + "..."
                            : "--"}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E8E4DF] px-4 py-3">
            <p className="text-sm text-[#8C8279]">
              Page {meta.page} sur {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-[#E8E4DF]"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Precedent
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-[#E8E4DF]"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
