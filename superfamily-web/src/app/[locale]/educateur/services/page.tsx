"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Trash2,
  Briefcase,
  Home,
  Car,
  Palette,
  BookOpen,
  Moon,
  Sun,
  AlertTriangle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { apiGet, apiPost, apiDelete } from "@/lib/api/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

interface EducatorService {
  id: string
  service_id: string
  hourly_rate_cents: number
  minimum_booking_hours: number | null
  can_provide_on_weekends: boolean
  can_provide_overnight: boolean
  service: {
    id: string
    name: string
    slug: string
    description?: string
  }
}

interface EducatorProfile {
  data: {
    educator_services: EducatorService[]
  }
}

const serviceIcons: Record<string, LucideIcon> = {
  "garde-domicile": Home,
  "garde-transport": Car,
  "activites-creatives": Palette,
  "aide-devoirs": BookOpen,
  "garde-nuit": Moon,
  "garde-weekend": Sun,
}

function getServiceIcon(slug: string): LucideIcon {
  return serviceIcons[slug] ?? Briefcase
}

function AddServiceDialog({
  existingServiceIds,
  onSuccess,
}: {
  existingServiceIds: string[]
  onSuccess: () => void
}) {
  const t = useTranslations("services")
  const tc = useTranslations("common")
  const [open, setOpen] = React.useState(false)
  const [selectedServiceName, setSelectedServiceName] = React.useState("")
  const [hourlyRate, setHourlyRate] = React.useState("")
  const [minimumHours, setMinimumHours] = React.useState("")
  const [canWeekends, setCanWeekends] = React.useState(false)
  const [canOvernight, setCanOvernight] = React.useState(false)

  // Fetch the services catalog from the backend
  const { data: catalogRes } = useQuery<any>({
    queryKey: ["services-catalog"],
    queryFn: () => apiGet("/educators/services-catalog"),
  })
  const serviceOptions: { id: string; name: string }[] = (catalogRes?.data || catalogRes || []).map(
    (s: any) => ({ id: s.id, name: s.name })
  )

  const availableOptions = serviceOptions.filter(
    (opt) => !existingServiceIds.includes(opt.id) && !existingServiceIds.includes(opt.name)
  )

  const selectedServiceId = serviceOptions.find((s) => s.name === selectedServiceName)?.id || ""

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost("/educators/me/services", {
        service_id: selectedServiceId,
        hourly_rate_cents: Math.round(parseFloat(hourlyRate) * 100),
        ...(minimumHours ? { minimum_booking_hours: parseInt(minimumHours) } : {}),
        can_provide_on_weekends: canWeekends,
        can_provide_overnight: canOvernight,
      }),
    onSuccess: () => {
      toast.success(t("serviceAdded"))
      onSuccess()
      setOpen(false)
      setSelectedServiceName("")
      setHourlyRate("")
      setMinimumHours("")
      setCanWeekends(false)
      setCanOvernight(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || t("serviceAddError"))
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-[#2E7D52] px-4 py-2 text-sm font-medium text-white hover:bg-[#256943]">
        <Plus className="mr-2 h-4 w-4" />
        {t("addService")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addServiceTitle")}</DialogTitle>
          <DialogDescription>
            {t("addServiceDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("serviceType")}</Label>
            <Select
              value={selectedServiceName}
              onValueChange={(v) => {
                if (v) setSelectedServiceName(v)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectService")} />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.name}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-rate">{t("hourlyRate")}</Label>
            <Input
              id="service-rate"
              type="number"
              min="10"
              max="200"
              step="0.50"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="18.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-min-hours">{t("minimumHours")}</Label>
            <Input
              id="service-min-hours"
              type="number"
              min="1"
              max="12"
              value={minimumHours}
              onChange={(e) => setMinimumHours(e.target.value)}
              placeholder="2"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={canWeekends}
                onChange={(e) => setCanWeekends(e.target.checked)}
                className="rounded border-[#E8E4DF]"
              />
              {t("availableWeekends")}
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={canOvernight}
                onChange={(e) => setCanOvernight(e.target.checked)}
                className="rounded border-[#E8E4DF]"
              />
              {t("nightCare")}
            </label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">
            {tc("cancel")}
          </DialogClose>
          <Button
            className="bg-[#2E7D52] text-white hover:bg-[#256943]"
            onClick={() => createMutation.mutate()}
            disabled={!selectedServiceId || !hourlyRate || createMutation.isPending}
          >
            {createMutation.isPending ? tc("adding") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteConfirmDialog({
  serviceName,
  onConfirm,
  isPending,
}: {
  serviceName: string
  onConfirm: () => void
  isPending: boolean
}) {
  const t = useTranslations("services")
  const tc = useTranslations("common")
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted">
        <Trash2 className="h-4 w-4 text-red-400" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#C45B3E]" />
            {t("deleteService")}
          </DialogTitle>
          <DialogDescription>
            {t("deleteServiceConfirm", { name: serviceName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">
            {tc("cancel")}
          </DialogClose>
          <Button
            className="bg-[#C45B3E] text-white hover:bg-[#A84B33]"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
            disabled={isPending}
          >
            {isPending ? tc("deleting") : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ServicesPage() {
  const t = useTranslations("services")
  const queryClient = useQueryClient()

  const { data: educatorProfile, isLoading } = useQuery<EducatorProfile>({
    queryKey: ["educator-profile"],
    queryFn: () => apiGet("/educators/me"),
  })

  const services = educatorProfile?.data?.educator_services ?? []
  const existingServiceIds = services.map((s) => s.service_id)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/educators/me/services/${id}`),
    onSuccess: () => {
      toast.success(t("serviceDeleted"))
      queryClient.invalidateQueries({ queryKey: ["educator-profile"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || t("serviceDeleteError"))
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {t("myServices")}
          </h1>
          <p className="text-sm text-[#8C8279]">
            {t("manageServices")}
          </p>
        </div>
        <AddServiceDialog
          existingServiceIds={existingServiceIds}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["educator-profile"] })
          }
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
            <Briefcase className="h-8 w-8 text-[#8C8279]" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
            {t("noService")}
          </h3>
          <p className="mt-1 text-sm text-[#8C8279]">
            {t("noServiceDesc")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((es) => {
            const slug = es.service?.slug ?? es.service_id
            const Icon = getServiceIcon(slug)
            return (
              <Card key={es.id} className="border-[#E8E4DF] bg-white">
                <CardContent className="pt-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F5EE]">
                        <Icon className="h-6 w-6 text-[#2E7D52]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1A1A1A]">
                          {es.service?.name ?? slug}
                        </h3>
                        <p className="text-sm font-bold text-[#2E7D52]">
                          {formatCurrency(es.hourly_rate_cents / 100)} {t("perHour")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <DeleteConfirmDialog
                        serviceName={es.service?.name ?? slug}
                        onConfirm={() => deleteMutation.mutate(es.id)}
                        isPending={deleteMutation.isPending}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {es.minimum_booking_hours && (
                      <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-xs text-[#8C8279]">
                        {t("minHoursShort", { hours: es.minimum_booking_hours })}
                      </span>
                    )}
                    {es.can_provide_on_weekends && (
                      <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-xs text-[#8C8279]">
                        {t("weekendsShort")}
                      </span>
                    )}
                    {es.can_provide_overnight && (
                      <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-xs text-[#8C8279]">
                        {t("nightShort")}
                      </span>
                    )}
                  </div>
                  {es.service?.description && (
                    <p className="mt-3 text-sm text-[#8C8279]">
                      {es.service.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
