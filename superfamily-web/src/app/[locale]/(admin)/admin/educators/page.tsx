"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { GraduationCap, Loader2, ArrowRight, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

import { apiGet } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface AdminEducatorRow {
  id: string
  profile_id: string
  license_status: "none" | "pending" | "approved" | "rejected"
  created_at: string
  profiles: {
    first_name: string
    last_name: string
    email: string
    is_active: boolean
  }
}

interface AdminEducatorsResponse {
  data: AdminEducatorRow[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminEducatorsPage() {
  const { data, isLoading } = useQuery<AdminEducatorsResponse>({
    queryKey: ["admin", "educators"],
    queryFn: () => apiGet("/admin/educators"),
  })

  const rows = data?.data ?? []

  const formatDate = (iso: string | null) => {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 font-medium">Approuvé</span>
      case "pending":
        return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 font-medium">En attente</span>
      case "rejected":
        return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 font-medium">Rejeté</span>
      default:
        return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 font-medium">Aucun</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3F0FF]">
          <GraduationCap className="h-5 w-5 text-[#0066FF]" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Éducateurs
          </h1>
          <p className="text-sm text-[#8C8279]">Gérez les éducateurs de la plateforme</p>
        </div>
      </div>

      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-base font-bold text-[#1A1A1A]">
            Total: {data?.meta?.total ?? 0}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1 border-[#E8E4DF]">
              <Link href="/admin/documents" className="flex items-center gap-2">
                Voir les documents
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 border-[#E8E4DF]">
              <Link href="/admin/educators/licenses" className="flex items-center gap-2">
                Voir les permis en attente
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F5]">
                <GraduationCap className="h-6 w-6 text-[#8C8279]" />
              </div>
              <p className="text-sm text-[#8C8279]">Aucun éducateur trouvé.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const profile = row.profiles
                const name = profile
                  ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                  : "—"
                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-4 md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1A1A1A]">{name}</p>
                        {profile?.is_active ? (
                           <span title="Actif" className="inline-flex">
                              <CheckCircle className="h-4 w-4 text-green-500" aria-label="Actif" />
                           </span>
                        ) : (
                           <span title="Inactif" className="inline-flex">
                              <XCircle className="h-4 w-4 text-red-500" aria-label="Inactif" />
                           </span>
                        )}
                      </div>
                      <p className="text-sm text-[#8C8279]">{profile?.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8C8279]">
                        <span>Permis: {getStatusBadge(row.license_status)}</span>
                        <span>|</span>
                        <span>Inscrit le {formatDate(row.created_at)}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-[#E8E4DF]"
                    >
                      {/* TODO: Link to specific educator admin page */}
                      Voir le profil
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
