"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  User,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface AdminUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

interface UsersResponse {
  data: AdminUser[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const roleConfig: Record<string, { label: string; className: string }> = {
  parent: { label: "Parent", className: "bg-[#E3F0FF] text-[#1976D2]" },
  educator: { label: "Educateur", className: "bg-[#E8F5EE] text-[#2E7D52]" },
  admin: { label: "Admin", className: "bg-[#F5F0FF] text-[#7B1FA2]" },
}

export default function UtilisateursPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("")
  const [page, setPage] = React.useState(1)
  const limit = 20

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const queryParams: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  }
  if (roleFilter) queryParams.role = roleFilter
  if (debouncedSearch) queryParams.search = debouncedSearch

  const { data: response, isLoading } = useQuery<UsersResponse>({
    queryKey: ["admin-users", page, limit, roleFilter, debouncedSearch],
    queryFn: () => apiGet("/admin/users", queryParams),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiPatch(`/admin/users/${id}/status`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success("Statut mis a jour avec succes")
    },
    onError: () => {
      toast.error("Erreur lors de la mise a jour du statut")
    },
  })

  const users = response?.data ?? []
  const meta = response?.meta

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Gestion des utilisateurs
          </h1>
          <p className="text-sm text-[#8C8279]">
            {meta ? `${meta.total} utilisateur${meta.total > 1 ? "s" : ""} au total` : "Chargement..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8279]" />
            <select
              className="h-9 rounded-md border border-[#E8E4DF] bg-white pl-9 pr-4 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2E7D52]"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tous les roles</option>
              <option value="parent">Parents</option>
              <option value="educator">Educateurs</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8279]" />
            <Input
              className="w-64 pl-9"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E8E4DF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E4DF] bg-[#FAF8F5]">
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">
                  Inscription
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">
                  Verifie
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1A1A1A]">
                  Actions
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
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[#8C8279]"
                  >
                    Aucun utilisateur trouve
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleCfg = roleConfig[user.role] ?? {
                    label: user.role,
                    className: "bg-[#FAF8F5] text-[#8C8279]",
                  }
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[#E8E4DF] transition-colors hover:bg-[#FAF8F5]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF8F5]">
                            <User className="h-4 w-4 text-[#8C8279]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1A1A1A]">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-[#8C8279]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={roleCfg.className}>{roleCfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#8C8279]">
                        {formatDate(user.created_at, "d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_verified ? (
                          <Badge className="bg-[#E8F5EE] text-[#2E7D52]">Oui</Badge>
                        ) : (
                          <Badge className="bg-[#FFF3EE] text-[#C45B3E]">Non</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_active ? (
                          <Badge className="bg-[#E8F5EE] text-[#2E7D52]">Actif</Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-600">Suspendu</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-[#E8E4DF] text-red-600 hover:bg-red-50"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: user.id,
                                is_active: false,
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Suspendre
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-[#E8E4DF] text-[#2E7D52] hover:bg-[#E8F5EE]"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: user.id,
                                is_active: true,
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Activer
                          </Button>
                        )}
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
