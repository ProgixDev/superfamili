"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react"
import { apiGet, apiPost } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " $"
}

const payoutStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-[#FFF3EE] text-[#C45B3E]" },
  in_transit: { label: "En transit", className: "bg-[#E3F0FF] text-[#1976D2]" },
  paid: { label: "Payé", className: "bg-[#E8F5EE] text-[#2E7D52]" },
  completed: { label: "Complété", className: "bg-[#E8F5EE] text-[#2E7D52]" },
  failed: { label: "Échoué", className: "bg-red-50 text-red-600" },
  cancelled: { label: "Annulé", className: "bg-red-50 text-red-600" },
}

export default function RevenusPage() {
  const { data: payoutsRes, isLoading: payoutsLoading } = useQuery<any>({
    queryKey: ["educator-payouts"],
    queryFn: () => apiGet("/payments/payouts"),
  })

  const { data: stripeStatusRes, isLoading: stripeLoading } = useQuery<any>({
    queryKey: ["stripe-connect-status"],
    queryFn: () => apiGet("/payments/stripe/connect-status"),
  })

  const connectMutation = useMutation({
    mutationFn: () => apiPost<any>("/payments/stripe/connect-account"),
    onSuccess: (response) => {
      const url = response?.data?.onboarding_url || response?.onboarding_url
      if (url) {
        window.open(url, "_blank")
      } else {
        toast.success("Compte Stripe Connect créé")
      }
    },
    onError: () => {
      toast.error("Erreur lors de la création du compte Stripe")
    },
  })

  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear())

  const { data: reportRes, isLoading: reportLoading } = useQuery<any>({
    queryKey: ["annual-report", selectedYear],
    queryFn: () => apiGet(`/payments/annual-report/${selectedYear}`),
  })
  const reportData = reportRes?.data || reportRes

  const payouts: any[] = payoutsRes?.data || []
  const stripeStatus = stripeStatusRes?.data || stripeStatusRes || {}

  const isConnected = stripeStatus?.connected === true || stripeStatus?.details_submitted === true
  const chargesEnabled = stripeStatus?.charges_enabled === true

  // Summary stats
  const completedPayouts = payouts.filter(
    (p: any) => p.status === "paid" || p.status === "completed"
  )
  const pendingPayouts = payouts.filter(
    (p: any) => p.status === "pending" || p.status === "in_transit"
  )
  const totalEarned = completedPayouts.reduce(
    (sum: number, p: any) => sum + (p.net_amount_cents || p.amount_cents || 0),
    0
  )
  const totalPending = pendingPayouts.reduce(
    (sum: number, p: any) => sum + (p.net_amount_cents || p.amount_cents || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Revenus
        </h1>
        <p className="text-sm text-[#8C8279]">
          Consultez vos versements et gérez votre compte Stripe
        </p>
      </div>

      {/* Stripe Connect status */}
      {stripeLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <Card className="border-[#E8E4DF] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <CreditCard className="h-5 w-5 text-[#2E7D52]" />
              Compte Stripe Connect
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {isConnected && chargesEnabled ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F5EE]">
                      <CheckCircle className="h-5 w-5 text-[#2E7D52]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">Compte connecté</p>
                      <p className="text-sm text-[#8C8279]">
                        Votre compte Stripe est actif et prêt à recevoir des paiements.
                      </p>
                    </div>
                  </>
                ) : isConnected && !chargesEnabled ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF3EE]">
                      <AlertCircle className="h-5 w-5 text-[#C45B3E]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">Configuration incomplète</p>
                      <p className="text-sm text-[#8C8279]">
                        Votre compte Stripe est connecté mais les paiements ne sont pas encore activés.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5]">
                      <CreditCard className="h-5 w-5 text-[#8C8279]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">Compte non connecté</p>
                      <p className="text-sm text-[#8C8279]">
                        Connectez votre compte Stripe pour recevoir vos versements.
                      </p>
                    </div>
                  </>
                )}
              </div>
              {!isConnected || !chargesEnabled ? (
                <Button
                  className="gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  <ExternalLink className="h-4 w-4" />
                  {connectMutation.isPending ? "Connexion..." : "Connecter Stripe"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {payoutsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <Card className="border-[#E8E4DF] bg-white">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F5EE]">
                    <TrendingUp className="h-6 w-6 text-[#2E7D52]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#8C8279]">Total gagné</p>
                    <p className="font-heading text-xl font-bold text-[#1A1A1A]">
                      {formatAmount(totalEarned)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E8E4DF] bg-white">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF3EE]">
                    <Clock className="h-6 w-6 text-[#C45B3E]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#8C8279]">En attente</p>
                    <p className="font-heading text-xl font-bold text-[#1A1A1A]">
                      {formatAmount(totalPending)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E8E4DF] bg-white">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E3F0FF]">
                    <DollarSign className="h-6 w-6 text-[#1976D2]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#8C8279]">Versements complétés</p>
                    <p className="font-heading text-xl font-bold text-[#1A1A1A]">
                      {completedPayouts.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Payouts list */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <DollarSign className="h-5 w-5 text-[#2E7D52]" />
            Historique des versements
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {payoutsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
                <DollarSign className="h-8 w-8 text-[#8C8279]" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
                Aucun versement
              </h3>
              <p className="mt-1 text-sm text-[#8C8279]">
                Vos versements apparaîtront ici une fois que vous aurez complété des réservations.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payouts.map((payout: any) => {
                const cfg =
                  payoutStatusConfig[payout.status] || payoutStatusConfig.pending
                const dateStr = new Date(payout.created_at).toLocaleDateString("fr-CA", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
                const amountCents = payout.net_amount_cents || payout.amount_cents || 0

                return (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
                        <DollarSign className="h-4 w-4 text-[#2E7D52]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          {dateStr}
                        </p>
                        {payout.booking_id && (
                          <p className="text-xs text-[#8C8279]">
                            Ref: {payout.booking_id.slice(0, 8)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                      <p className="font-heading text-lg font-bold text-[#1A1A1A]">
                        {formatAmount(amountCents)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rapport annuel */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <FileText className="h-5 w-5 text-[#2E7D52]" />
              Relevé annuel de revenus
            </CardTitle>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-[#E8E4DF] bg-white px-3 py-1.5 text-sm"
            >
              {[2026, 2025].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {reportLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : reportData?.summary ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#E8F5EE] p-4 text-center">
                  <p className="text-xs text-[#607060]">Revenus bruts</p>
                  <p className="font-heading text-xl font-bold text-[#2E7D52]">
                    {formatAmount(reportData.summary.total_gross_cents)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#FFF3EE] p-4 text-center">
                  <p className="text-xs text-[#607060]">Frais plateforme</p>
                  <p className="font-heading text-xl font-bold text-[#C45B3E]">
                    {formatAmount(reportData.summary.total_platform_fees_cents)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#E3F0FF] p-4 text-center">
                  <p className="text-xs text-[#607060]">Revenus nets</p>
                  <p className="font-heading text-xl font-bold text-[#1976D2]">
                    {formatAmount(reportData.summary.total_net_earnings_cents)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#8C8279]">
                {reportData.summary.total_bookings} prestation{reportData.summary.total_bookings > 1 ? "s" : ""} complétée{reportData.summary.total_bookings > 1 ? "s" : ""} en {selectedYear}
              </p>
              <p className="text-xs italic text-[#8C8279]">
                {reportData.disclaimer}
              </p>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#8C8279]">
              Aucune donnée disponible pour {selectedYear}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
