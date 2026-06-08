"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Users,
  GraduationCap,
  CalendarCheck,
  DollarSign,
  CreditCard,
  TrendingUp,
  ArrowRight,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { apiGet } from "@/lib/api/client"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

interface DashboardStats {
  data: {
    total_users: number
    total_bookings: number
    total_revenue_cents: number
    active_educators: number
  }
}

interface CommissionSummary {
  data: {
    period: string
    total_revenue: number
    total_commission: number
    total_educator_earnings: number
    total_mileage_fees: number
    booking_count: number
  }
}

export default function AdminDashboardPage() {
  const { data: statsResponse, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => apiGet("/admin/dashboard/stats"),
  })

  const { data: commissionResponse, isLoading: commissionLoading } = useQuery<CommissionSummary>({
    queryKey: ["admin-commissions-summary"],
    queryFn: () => apiGet("/admin/commissions/summary", { period: "month" }),
  })

  const isLoading = statsLoading || commissionLoading
  const stats = statsResponse?.data
  const commission = commissionResponse?.data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Administration
        </h1>
        <p className="text-sm text-[#8C8279]">
          Vue d&apos;ensemble de la plateforme SuperFamili
        </p>
      </div>

      {/* User stats */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-bold text-[#1A1A1A]">Utilisateurs</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                icon={Users}
                value={String(stats?.total_users ?? 0)}
                label="Utilisateurs inscrits"
                iconBgClass="bg-[#E8F5EE]"
              />
              <StatCard
                icon={GraduationCap}
                value={String(stats?.active_educators ?? 0)}
                label="Educateurs actifs"
                iconBgClass="bg-[#E3F0FF]"
              />
              <StatCard
                icon={CalendarCheck}
                value={String(stats?.total_bookings ?? 0)}
                label="Reservations totales"
                iconBgClass="bg-[#E8F5EE]"
              />
              <StatCard
                icon={DollarSign}
                value={formatCurrency((stats?.total_revenue_cents ?? 0) / 100)}
                label="Revenus totaux"
                iconBgClass="bg-[#FFF3EE]"
              />
            </>
          )}
        </div>
      </div>

      {/* Financial stats */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-bold text-[#1A1A1A]">
          Finances (ce mois)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                icon={DollarSign}
                value={formatCurrency((commission?.total_revenue ?? 0) / 100)}
                label="Volume total (mois)"
                iconBgClass="bg-[#FFF3EE]"
              />
              <StatCard
                icon={CreditCard}
                value={formatCurrency((commission?.total_commission ?? 0) / 100)}
                label="Commission SuperFamili"
                iconBgClass="bg-[#E8F5EE]"
              />
              <StatCard
                icon={GraduationCap}
                value={formatCurrency((commission?.total_educator_earnings ?? 0) / 100)}
                label="Reverse aux educateurs"
                iconBgClass="bg-[#E3F0FF]"
              />
              <StatCard
                icon={BarChart3}
                value={String(commission?.booking_count ?? 0)}
                label="Reservations du mois"
                iconBgClass="bg-[#F5F0FF]"
              />
            </>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-[#E8E4DF] bg-white">
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <p className="font-semibold text-[#1A1A1A]">Utilisateurs</p>
              <p className="text-2xl font-bold text-[#2E7D52]">
                {stats?.total_users ?? 0}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1 border-[#E8E4DF]">
              <Link href="/admin/utilisateurs">
                Gerer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-[#E8E4DF] bg-white">
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <p className="font-semibold text-[#1A1A1A]">Transactions</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {formatCurrency((commission?.total_revenue ?? 0) / 100)}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1 border-[#E8E4DF]">
              <Link href="/admin/transactions">
                Voir
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-[#E8E4DF] bg-white">
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <p className="font-semibold text-[#1A1A1A]">Litiges</p>
              <p className="text-sm text-[#8C8279]">Voir les litiges en cours</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1 border-[#E8E4DF]">
              <Link href="/admin/litiges">
                Voir
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
