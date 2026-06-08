"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Clock, Plus, CalendarDays, Loader2 } from "lucide-react"
import { apiGet, apiPost, apiPut } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const DAYS = [
  { index: 1, label: "Lundi", short: "Lun" },
  { index: 2, label: "Mardi", short: "Mar" },
  { index: 3, label: "Mercredi", short: "Mer" },
  { index: 4, label: "Jeudi", short: "Jeu" },
  { index: 5, label: "Vendredi", short: "Ven" },
  { index: 6, label: "Samedi", short: "Sam" },
  { index: 0, label: "Dimanche", short: "Dim" },
]

const TIME_SLOTS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
]

interface AvailabilitySlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available?: boolean
}

interface AvailabilityOverride {
  id: string
  date_start: string
  date_end: string
  is_available: boolean
  start_time?: string
  end_time?: string
  reason?: string
}

interface EducatorProfile {
  data: {
    educator_availability: AvailabilitySlot[]
    availability_overrides?: AvailabilityOverride[]
  }
}

function slotsToSelectedSet(slots: AvailabilitySlot[]): Set<string> {
  const selected = new Set<string>()
  for (const slot of slots) {
    const startHour = parseInt(slot.start_time.split(":")[0])
    const endHour = parseInt(slot.end_time.split(":")[0])
    for (let h = startHour; h < endHour; h++) {
      const timeStr = `${String(h).padStart(2, "0")}:00`
      selected.add(`${slot.day_of_week}-${timeStr}`)
    }
  }
  return selected
}

function selectedSetToSlots(
  selectedSlots: Set<string>
): { day_of_week: number; start_time: string; end_time: string }[] {
  const slots: { day_of_week: number; start_time: string; end_time: string }[] = []

  for (const day of DAYS) {
    const dayTimes = TIME_SLOTS.filter((t) =>
      selectedSlots.has(`${day.index}-${t}`)
    ).sort()

    if (dayTimes.length === 0) continue

    // Group consecutive hours into ranges
    let start = dayTimes[0]
    let prev = dayTimes[0]

    for (let i = 1; i <= dayTimes.length; i++) {
      const curr = dayTimes[i]
      const prevHour = parseInt(prev.split(":")[0])
      const currHour = curr ? parseInt(curr.split(":")[0]) : -1

      if (currHour !== prevHour + 1) {
        const endHour = prevHour + 1
        slots.push({
          day_of_week: day.index,
          start_time: start,
          end_time: `${String(endHour).padStart(2, "0")}:00`,
        })
        start = curr
      }
      prev = curr
    }
  }

  return slots
}

export default function DisponibilitesPage() {
  const queryClient = useQueryClient()
  const [selectedSlots, setSelectedSlots] = React.useState<Set<string>>(new Set())
  const [initialized, setInitialized] = React.useState(false)

  const { data: educatorProfile, isLoading } = useQuery<EducatorProfile>({
    queryKey: ["educator-profile"],
    queryFn: () => apiGet("/educators/me"),
  })

  const availability = educatorProfile?.data?.educator_availability ?? []
  const overrides = educatorProfile?.data?.availability_overrides ?? []

  // Initialize selected slots from backend data
  React.useEffect(() => {
    if (availability.length > 0 && !initialized) {
      setSelectedSlots(slotsToSelectedSet(availability))
      setInitialized(true)
    } else if (!isLoading && availability.length === 0 && !initialized) {
      setInitialized(true)
    }
  }, [availability, isLoading, initialized])

  const saveMutation = useMutation({
    mutationFn: (slots: { day_of_week: number; start_time: string; end_time: string }[]) =>
      apiPut("/educators/me/availability", { slots }),
    onSuccess: () => {
      toast.success("Disponibilités sauvegardées avec succès")
      queryClient.invalidateQueries({ queryKey: ["educator-profile"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la sauvegarde")
    },
  })

  const toggleSlot = (dayIndex: number, time: string) => {
    const key = `${dayIndex}-${time}`
    setSelectedSlots((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSave = () => {
    const slots = selectedSetToSlots(selectedSlots)
    saveMutation.mutate(slots)
  }

  const formatOverrideDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-CA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Disponibilités
          </h1>
          <p className="text-sm text-[#8C8279]">
            Définissez vos heures de disponibilité hebdomadaires
          </p>
        </div>
        <Button
          className="bg-[#2E7D52] text-white hover:bg-[#256943]"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            "Sauvegarder"
          )}
        </Button>
      </div>

      {/* Weekly grid */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
            <Clock className="h-5 w-5 text-[#2E7D52]" />
            Grille hebdomadaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#2E7D52]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Header row */}
                <div className="mb-2 grid grid-cols-[80px_repeat(7,1fr)] gap-1">
                  <div />
                  {DAYS.map((day) => (
                    <div
                      key={day.index}
                      className="text-center text-xs font-semibold text-[#1A1A1A]"
                    >
                      <span className="hidden sm:inline">{day.label}</span>
                      <span className="sm:hidden">{day.short}</span>
                    </div>
                  ))}
                </div>
                {/* Time rows */}
                {TIME_SLOTS.map((time) => (
                  <div
                    key={time}
                    className="grid grid-cols-[80px_repeat(7,1fr)] gap-1"
                  >
                    <div className="flex items-center text-xs text-[#8C8279]">
                      {time}
                    </div>
                    {DAYS.map((day) => {
                      const isSelected = selectedSlots.has(`${day.index}-${time}`)
                      return (
                        <button
                          key={`${day.index}-${time}`}
                          onClick={() => toggleSlot(day.index, time)}
                          className={cn(
                            "h-8 rounded-md border transition-colors",
                            isSelected
                              ? "border-[#2E7D52] bg-[#2E7D52]/20"
                              : "border-[#E8E4DF] bg-white hover:bg-[#FAF8F5]"
                          )}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-[#8C8279]">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-[#2E7D52] bg-[#2E7D52]/20" />
              Disponible
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-[#E8E4DF] bg-white" />
              Non disponible
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Override dates */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#1A1A1A]">
            <CalendarDays className="h-5 w-5 text-[#2E7D52]" />
            Exceptions de dates
          </CardTitle>
          <AddOverrideDialog
            onSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ["educator-profile"] })
            }
          />
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8C8279]">
              Aucune exception configurée.
            </p>
          ) : (
            <div className="space-y-2">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {formatOverrideDate(override.date_start)}
                      {override.date_end !== override.date_start &&
                        ` - ${formatOverrideDate(override.date_end)}`}
                    </p>
                    <p className="text-xs text-[#8C8279]">
                      {override.is_available
                        ? "Disponible (extra)"
                        : "Non disponible"}
                      {override.start_time &&
                        override.end_time &&
                        ` \u00B7 ${override.start_time} - ${override.end_time}`}
                      {override.reason && ` - ${override.reason}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AddOverrideDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [dateStart, setDateStart] = React.useState("")
  const [dateEnd, setDateEnd] = React.useState("")
  const [available, setAvailable] = React.useState(false)
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [reason, setReason] = React.useState("")

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost("/educators/me/availability/overrides", {
        date_start: dateStart,
        date_end: dateEnd || dateStart,
        is_available: available,
        ...(startTime ? { start_time: startTime } : {}),
        ...(endTime ? { end_time: endTime } : {}),
        ...(reason ? { reason } : {}),
      }),
    onSuccess: () => {
      toast.success("Exception ajoutée avec succès")
      onSuccess()
      setOpen(false)
      setDateStart("")
      setDateEnd("")
      setAvailable(false)
      setStartTime("")
      setEndTime("")
      setReason("")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'ajout de l'exception")
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-1 rounded-md border border-[#E8E4DF] bg-background px-3 py-1.5 text-sm font-medium">
        <Plus className="h-4 w-4" />
        Ajouter
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter une exception</DialogTitle>
          <DialogDescription>
            Ajoutez une date où vous ne serez pas disponible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="override-date-start">Date de début</Label>
            <Input
              id="override-date-start"
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="override-date-end">Date de fin (optionnel)</Label>
            <Input
              id="override-date-end"
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              min={dateStart}
            />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <div className="flex gap-3">
              <Button
                variant={!available ? "default" : "outline"}
                size="sm"
                onClick={() => setAvailable(false)}
                className={!available ? "bg-[#C45B3E] text-white" : ""}
              >
                Non disponible
              </Button>
              <Button
                variant={available ? "default" : "outline"}
                size="sm"
                onClick={() => setAvailable(true)}
                className={available ? "bg-[#2E7D52] text-white" : ""}
              >
                Disponible (extra)
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="override-start-time">Heure début (optionnel)</Label>
              <Input
                id="override-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-end-time">Heure fin (optionnel)</Label>
              <Input
                id="override-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="override-reason">Raison (optionnel)</Label>
            <Input
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Jour férié, rendez-vous..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">
            Annuler
          </DialogClose>
          <Button
            className="bg-[#2E7D52] text-white hover:bg-[#256943]"
            onClick={() => createMutation.mutate()}
            disabled={!dateStart || createMutation.isPending}
          >
            {createMutation.isPending ? "Ajout en cours..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
