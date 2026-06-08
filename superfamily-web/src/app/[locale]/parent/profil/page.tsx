"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { User, Mail, Phone, MapPin, FileText, Save } from "lucide-react"
import { useTranslations } from "next-intl"
import { apiGet, apiPatch } from "@/lib/api/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { LocationPicker } from "@/components/location/location-picker"
import { ProfilePhotoUploader } from "@/components/profile/profile-photo-uploader"

interface ProfileData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  postal_code: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  bio: string | null
  avatar_url: string | null
  role: string
  created_at: string
  role_profile?: Record<string, unknown>
}

interface ProfileResponse {
  data: ProfileData
}

interface ProfileFormValues {
  first_name: string
  last_name: string
  phone: string
  postal_code: string
  city: string
  bio: string
}

export default function ProfilPage() {
  const t = useTranslations("profile")
  const tc = useTranslations("common")
  const tdt = useTranslations("dateTime")
  const queryClient = useQueryClient()

  const dateLocale = tdt("locale")

  function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      parent: tc("parent"),
      educateur: tc("educator"),
      educator: tc("educator"),
      admin: tc("administrator"),
    }
    return labels[role] ?? role
  }

  function formatMemberSince(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString(dateLocale, {
      month: "long",
      year: "numeric",
    })
  }

  const { data: profileResponse, isLoading } = useQuery<ProfileResponse>({
    queryKey: ["profile-me"],
    queryFn: () => apiGet("/profiles/me"),
  })

  const profile = profileResponse?.data

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<ProfileFormValues>()

  // Reset form when profile data loads
  React.useEffect(() => {
    if (profile) {
      reset({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
        postal_code: profile.postal_code ?? "",
        city: profile.city ?? "",
        bio: profile.bio ?? "",
      })
    }
  }, [profile, reset])

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormValues) =>
      apiPatch("/profiles/me", {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
        bio: data.bio || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] })
      toast.success(t("profileUpdated"))
    },
    onError: () => {
      toast.error(t("profileUpdateError"))
    },
  })

  const onSubmit = (data: ProfileFormValues) => {
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          {t("myProfile")}
        </h1>
        <p className="text-sm text-[#8C8279]">
          {t("managePersonalInfo")}
        </p>
      </div>

      {/* Profile header card */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <ProfilePhotoUploader
              avatarUrl={profile?.avatar_url}
              firstName={profile?.first_name}
              lastName={profile?.last_name}
              compact
              onUploaded={() =>
                queryClient.invalidateQueries({ queryKey: ["profile-me"] })
              }
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-xl font-bold text-[#1A1A1A]">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-sm text-[#8C8279]">{profile?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                {profile?.role && (
                  <Badge className="bg-[#E8F5EE] text-[#2E7D52]">
                    {getRoleLabel(profile.role)}
                  </Badge>
                )}
                {profile?.created_at && (
                  <span className="text-xs text-[#8C8279]">
                    {tc("memberSince", { date: formatMemberSince(profile.created_at) })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form card */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <FileText className="h-5 w-5 text-[#2E7D52]" />
            {t("personalInfo")}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* First name */}
              <div className="space-y-2">
                <Label htmlFor="first_name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("firstName")}
                </Label>
                <Input
                  id="first_name"
                  {...register("first_name", { required: true })}
                  placeholder={t("firstNamePlaceholder")}
                  className="border-[#E8E4DF]"
                />
              </div>

              {/* Last name */}
              <div className="space-y-2">
                <Label htmlFor="last_name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("lastName")}
                </Label>
                <Input
                  id="last_name"
                  {...register("last_name", { required: true })}
                  placeholder={t("lastNamePlaceholder")}
                  className="border-[#E8E4DF]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("emailLabel")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email ?? ""}
                  disabled
                  className="border-[#E8E4DF] bg-[#FAF8F5] text-[#8C8279]"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("phone")}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="(514) 555-0123"
                  className="border-[#E8E4DF]"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#8C8279]" />
                {t("bio")}
              </Label>
              <Textarea
                id="bio"
                {...register("bio")}
                placeholder={t("bioPlaceholder")}
                className="min-h-24 border-[#E8E4DF]"
                rows={4}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
                disabled={!isDirty || isSubmitting || updateMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? tc("saving") : tc("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <MapPin className="h-5 w-5 text-[#2E7D52]" />
            {t("myHome")}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <LocationPicker
            latitude={profile?.latitude}
            longitude={profile?.longitude}
            address={profile?.address ?? undefined}
            label={t("homeLabel")}
            onSave={async (loc) => {
              await apiPatch("/profiles/me", {
                latitude: loc.latitude,
                longitude: loc.longitude,
                address: loc.address,
                city: loc.city || undefined,
              })
              queryClient.invalidateQueries({ queryKey: ["profile-me"] })
              toast.success(t("homeUpdated"))
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
