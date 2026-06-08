"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Baby, CalendarDays } from "lucide-react"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client"
import { toast } from "sonner"
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

interface Child {
  id: string
  first_name: string
  age_group: string
  date_of_birth?: string
  allergies?: string
  dietary_restrictions?: string
  special_needs?: string[]
  special_needs_description?: string
  medical_conditions?: string
  preferred_activities?: string[]
  is_active?: boolean
}

const AGE_GROUP_LABELS: Record<string, string> = {
  infant_0_12m: "0-12 mois",
  toddler_1_3y: "1-3 ans",
  preschool_3_5y: "3-5 ans",
  kindergarten_5_6y: "5-6 ans",
  school_6_12y: "6-12 ans",
  teen_12_18y: "12-18 ans",
}

function getAge(dateOfBirth?: string, ageGroup?: string): string {
  if (dateOfBirth) {
    const diff = Date.now() - new Date(dateOfBirth).getTime()
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
    if (years < 1) {
      const months = Math.floor(diff / (30.44 * 24 * 60 * 60 * 1000))
      return `${months} mois`
    }
    return `${years} an${years > 1 ? "s" : ""}`
  }
  return AGE_GROUP_LABELS[ageGroup || ""] || ageGroup || ""
}

function AddChildDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [firstName, setFirstName] = React.useState("")
  const [ageGroup, setAgeGroup] = React.useState("preschool_3_5y")
  const [birthDate, setBirthDate] = React.useState("")
  const [allergies, setAllergies] = React.useState("")
  const [specialNeeds, setSpecialNeeds] = React.useState("")

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost("/parents/children", {
        first_name: firstName,
        age_group: ageGroup,
        date_of_birth: birthDate || undefined,
        allergies: allergies || undefined,
        special_needs_description: specialNeeds || undefined,
      }),
    onSuccess: () => {
      toast.success(`${firstName} a ete ajoute avec succes`)
      onSuccess()
      setOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'ajout de l'enfant")
    },
  })

  const resetForm = () => {
    setFirstName("")
    setAgeGroup("preschool_3_5y")
    setBirthDate("")
    setAllergies("")
    setSpecialNeeds("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-[#2E7D52] px-4 py-2 text-sm font-medium text-white hover:bg-[#256943]">
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un enfant
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un enfant</DialogTitle>
          <DialogDescription>
            Renseignez les informations de votre enfant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="child-first-name">Prenom</Label>
              <Input
                id="child-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prenom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="child-age-group">Groupe d&apos;age</Label>
              <select
                id="child-age-group"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(AGE_GROUP_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="child-birth-date">Date de naissance</Label>
              <Input
                id="child-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="child-allergies">Allergies (optionnel)</Label>
              <Input
                id="child-allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Ex: arachides, lactose..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="child-special-needs">Besoins particuliers (optionnel)</Label>
            <Input
              id="child-special-needs"
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
              placeholder="Ex: TDAH, allergie alimentaire..."
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
            disabled={!firstName || createMutation.isPending}
          >
            {createMutation.isPending ? "Ajout en cours..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteChildDialog({
  child,
  onConfirm,
  isPending,
}: {
  child: Child
  onConfirm: () => void
  isPending: boolean
}) {
  const [open, setOpen] = React.useState(false)

  // Check if child has active bookings
  const { data: bookingsData } = useQuery<any>({
    queryKey: ["parent-bookings"],
    queryFn: () => apiGet("/bookings"),
    enabled: open,
  })

  const activeBookings = (bookingsData?.data || []).filter(
    (b: any) =>
      b.child_id === child.id &&
      ["pending_payment", "confirmed", "in_progress"].includes(b.status)
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4 text-red-400" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer {child.first_name} ?</DialogTitle>
          <DialogDescription>
            {activeBookings.length > 0 ? (
              <span className="text-red-600">
                Attention : {child.first_name} est associe a {activeBookings.length} reservation{activeBookings.length > 1 ? "s" : ""} active{activeBookings.length > 1 ? "s" : ""}.
                La suppression n&apos;annulera pas ces reservations, mais l&apos;enfant ne sera plus lie au profil.
              </span>
            ) : (
              "Cette action est irreversible. Le profil de l'enfant sera supprime."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Annuler
          </DialogClose>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
            disabled={isPending}
          >
            {isPending ? (
              <span>Suppression...</span>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditChildDialog({
  child,
  onSuccess,
}: {
  child: Child
  onSuccess: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [firstName, setFirstName] = React.useState(child.first_name)
  const [ageGroup, setAgeGroup] = React.useState(child.age_group)
  const [allergies, setAllergies] = React.useState(child.allergies || "")
  const [dietaryRestrictions, setDietaryRestrictions] = React.useState(child.dietary_restrictions || "")
  const [medicalConditions, setMedicalConditions] = React.useState(child.medical_conditions || "")

  const editMutation = useMutation({
    mutationFn: () =>
      apiPatch(`/parents/children/${child.id}`, {
        first_name: firstName,
        age_group: ageGroup,
        allergies: allergies || undefined,
        dietary_restrictions: dietaryRestrictions || undefined,
        medical_conditions: medicalConditions || undefined,
      }),
    onSuccess: () => {
      onSuccess()
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-[#FAF8F5] transition-colors"
      >
        <Pencil className="h-4 w-4 text-[#8C8279]" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier {child.first_name}</DialogTitle>
          <DialogDescription>
            Mettez a jour les informations de votre enfant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prenom</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Groupe d&apos;age</Label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(AGE_GROUP_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Allergies</Label>
            <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Ex: Arachides, lait..." />
          </div>
          <div className="space-y-2">
            <Label>Restrictions alimentaires</Label>
            <Input value={dietaryRestrictions} onChange={(e) => setDietaryRestrictions(e.target.value)} placeholder="Ex: Sans gluten..." />
          </div>
          <div className="space-y-2">
            <Label>Conditions medicales</Label>
            <Input value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="Ex: Asthme..." />
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Annuler
          </DialogClose>
          <Button
            className="bg-[#2E7D52] text-white hover:bg-[#256943]"
            onClick={() => editMutation.mutate()}
            disabled={!firstName || editMutation.isPending}
          >
            {editMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EnfantsPage() {
  const queryClient = useQueryClient()

  const { data: parentData, isLoading } = useQuery<any>({
    queryKey: ["parent-children"],
    queryFn: () => apiGet("/parents/me"),
  })
  const children: Child[] | undefined = parentData?.data?.children || parentData?.children

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/parents/children/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-children"] })
      toast.success("Enfant supprime avec succes")
    },
    onError: () => {
      toast.error("Erreur lors de la suppression")
    },
  })

  const allChildren = (children ?? []).filter((c) => c.is_active !== false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Mes enfants
          </h1>
          <p className="text-sm text-[#8C8279]">
            Gerez les profils de vos enfants
          </p>
        </div>
        <AddChildDialog
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["parent-children"] })
          }
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : allChildren.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
            <Baby className="h-8 w-8 text-[#8C8279]" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
            Aucun enfant ajoute
          </h3>
          <p className="mt-1 text-sm text-[#8C8279]">
            Ajoutez vos enfants pour pouvoir effectuer des reservations.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allChildren.map((child) => (
            <Card key={child.id} className="border-[#E8E4DF] bg-white">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5EE]">
                      <Baby className="h-6 w-6 text-[#2E7D52]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1A1A1A]">
                        {child.first_name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-[#8C8279]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {getAge(child.date_of_birth, child.age_group)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <EditChildDialog
                      child={child}
                      onSuccess={() =>
                        queryClient.invalidateQueries({ queryKey: ["parent-children"] })
                      }
                    />
                    <DeleteChildDialog
                      child={child}
                      onConfirm={() => deleteMutation.mutate(child.id)}
                      isPending={deleteMutation.isPending}
                    />
                  </div>
                </div>
                {(child.allergies || child.dietary_restrictions || child.medical_conditions) && (
                  <div className="mt-3 space-y-1 rounded-lg bg-[#FAF8F5] p-3 text-sm text-[#8C8279]">
                    {child.allergies && (
                      <p>
                        <span className="font-medium text-[#1A1A1A]">Allergies :</span>{" "}
                        {child.allergies}
                      </p>
                    )}
                    {child.dietary_restrictions && (
                      <p>
                        <span className="font-medium text-[#1A1A1A]">Regime :</span>{" "}
                        {child.dietary_restrictions}
                      </p>
                    )}
                    {child.medical_conditions && (
                      <p>
                        <span className="font-medium text-[#1A1A1A]">Medical :</span>{" "}
                        {child.medical_conditions}
                      </p>
                    )}
                  </div>
                )}
                {child.preferred_activities && child.preferred_activities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {child.preferred_activities.map((act) => (
                      <span
                        key={act}
                        className="rounded-full bg-[#E8F5EE] px-2.5 py-0.5 text-xs font-medium text-[#2E7D52]"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
