"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  Briefcase,
  Shield,
  Award,
  Navigation,
} from "lucide-react"
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
}

interface EducatorData {
  id: string
  years_of_experience: number | null
  bio_professional: string | null
  certifications: string[] | null
  service_radius_km: number | null
  special_needs_trained: boolean | null
  training_commitment: boolean | null
  average_rating: number | null
  total_reviews: number | null
}

interface ProfileResponse {
  data: ProfileData
}

interface EducatorResponse {
  data: EducatorData
}

interface ProfileFormValues {
  first_name: string
  last_name: string
  phone: string
  postal_code: string
  city: string
  bio: string
}

interface EducatorFormValues {
  years_of_experience: string
  bio_professional: string
  certifications: string
  service_radius_km: string
  special_needs_trained: boolean
  training_commitment: boolean
}

export default function EducateurProfilPage() {
  const t = useTranslations("profile")
  const tc = useTranslations("common")
  const tdt = useTranslations("dateTime")
  const queryClient = useQueryClient()

  const dateLocale = tdt("locale")

  function formatMemberSince(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString(dateLocale, {
      month: "long",
      year: "numeric",
    })
  }

  const { data: profileRes, isLoading: profileLoading } =
    useQuery<ProfileResponse>({
      queryKey: ["profile-me"],
      queryFn: () => apiGet("/profiles/me"),
    })

  const { data: educatorRes, isLoading: educatorLoading } =
    useQuery<EducatorResponse>({
      queryKey: ["educator-profile"],
      queryFn: () => apiGet("/educators/me"),
    })

  const profile: ProfileData | undefined = profileRes?.data
  const educator: EducatorData | undefined = educatorRes?.data
  const isLoading = profileLoading || educatorLoading

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { isDirty: isProfileDirty },
  } = useForm<ProfileFormValues>()

  const {
    register: registerEducator,
    handleSubmit: handleEducatorSubmit,
    reset: resetEducator,
    formState: { isDirty: isEducatorDirty },
    watch: watchEducator,
    setValue: setEducatorValue,
  } = useForm<EducatorFormValues>()

  const specialNeedsTrained = watchEducator("special_needs_trained")
  const trainingCommitment = watchEducator("training_commitment")

  // Reset forms when data loads
  React.useEffect(() => {
    if (profile) {
      resetProfile({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
        postal_code: profile.postal_code ?? "",
        city: profile.city ?? "",
        bio: profile.bio ?? "",
      })
    }
  }, [profile, resetProfile])

  React.useEffect(() => {
    if (educator) {
      resetEducator({
        years_of_experience: educator.years_of_experience?.toString() ?? "",
        bio_professional: educator.bio_professional ?? "",
        certifications: (educator.certifications || []).join(", "),
        service_radius_km: educator.service_radius_km?.toString() ?? "",
        special_needs_trained: educator.special_needs_trained ?? false,
        training_commitment: educator.training_commitment ?? false,
      })
    }
  }, [educator, resetEducator])

  const updateProfileMutation = useMutation({
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

  const updateEducatorMutation = useMutation({
    mutationFn: (data: EducatorFormValues) =>
      apiPatch("/educators/me", {
        years_of_experience: data.years_of_experience ? parseInt(data.years_of_experience) : undefined,
        bio_professional: data.bio_professional || undefined,
        certifications: data.certifications
          ? data.certifications.split(",").map((c) => c.trim()).filter(Boolean)
          : undefined,
        service_radius_km: data.service_radius_km ? parseFloat(data.service_radius_km) : undefined,
        special_needs_trained: data.special_needs_trained,
        training_commitment: data.training_commitment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educator-profile"] })
      toast.success(t("educatorProfileUpdated"))
    },
    onError: () => {
      toast.error(t("educatorProfileUpdateError"))
    },
  })

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data)
  }

  const onEducatorSubmit = (data: EducatorFormValues) => {
    updateEducatorMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
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
          {t("managePersonalAndProfessional")}
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
                <Badge className="bg-[#E8F5EE] text-[#2E7D52]">{tc("educator")}</Badge>
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

      {/* Base profile form */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <FileText className="h-5 w-5 text-[#2E7D52]" />
            {t("personalInfo")}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("firstName")}
                </Label>
                <Input
                  id="first_name"
                  {...registerProfile("first_name", { required: true })}
                  placeholder={t("firstNamePlaceholder")}
                  className="border-[#E8E4DF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("lastName")}
                </Label>
                <Input
                  id="last_name"
                  {...registerProfile("last_name", { required: true })}
                  placeholder={t("lastNamePlaceholder")}
                  className="border-[#E8E4DF]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("phone")}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...registerProfile("phone")}
                  placeholder="(514) 555-0123"
                  className="border-[#E8E4DF]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#8C8279]" />
                {t("bio")}
              </Label>
              <Textarea
                id="bio"
                {...registerProfile("bio")}
                placeholder={t("bioPlaceholder")}
                className="min-h-24 border-[#E8E4DF]"
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
                disabled={!isProfileDirty || updateProfileMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {updateProfileMutation.isPending ? tc("saving") : tc("save")}
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
            {t("myLocation")}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <LocationPicker
            latitude={profile?.latitude}
            longitude={profile?.longitude}
            address={profile?.address ?? undefined}
            label={t("locationLabel")}
            onSave={async (loc) => {
              await apiPatch("/profiles/me", {
                latitude: loc.latitude,
                longitude: loc.longitude,
                address: loc.address,
                city: loc.city || undefined,
              })
              queryClient.invalidateQueries({ queryKey: ["profile-me"] })
              toast.success(t("locationUpdated"))
            }}
          />
        </CardContent>
      </Card>

      {/* Educator-specific fields */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <Briefcase className="h-5 w-5 text-[#2E7D52]" />
            {t("professionalInfo")}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={handleEducatorSubmit(onEducatorSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="years_of_experience" className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("yearsExperience")}
                </Label>
                <Input
                  id="years_of_experience"
                  type="number"
                  min="0"
                  {...registerEducator("years_of_experience")}
                  placeholder="5"
                  className="border-[#E8E4DF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_radius_km" className="flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-[#8C8279]" />
                  {t("serviceRadius")}
                </Label>
                <Input
                  id="service_radius_km"
                  type="number"
                  min="1"
                  {...registerEducator("service_radius_km")}
                  placeholder="15"
                  className="border-[#E8E4DF]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio_professional" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#8C8279]" />
                {t("professionalBio")}
              </Label>
              <Textarea
                id="bio_professional"
                {...registerEducator("bio_professional")}
                placeholder={t("professionalBioPlaceholder")}
                className="min-h-24 border-[#E8E4DF]"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certifications" className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-[#8C8279]" />
                {t("certifications")}
              </Label>
              <Input
                id="certifications"
                {...registerEducator("certifications")}
                placeholder="RCR, Premiers soins, Petite enfance"
                className="border-[#E8E4DF]"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-[#8C8279]" />
                {t("specialNeedsTrained")}
              </Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={specialNeedsTrained ? "default" : "outline"}
                  size="sm"
                  className={specialNeedsTrained ? "bg-[#2E7D52] text-white" : "border-[#E8E4DF]"}
                  onClick={() => setEducatorValue("special_needs_trained", true, { shouldDirty: true })}
                >
                  {tc("yes")}
                </Button>
                <Button
                  type="button"
                  variant={!specialNeedsTrained ? "default" : "outline"}
                  size="sm"
                  className={!specialNeedsTrained ? "bg-[#8C8279] text-white" : "border-[#E8E4DF]"}
                  onClick={() => setEducatorValue("special_needs_trained", false, { shouldDirty: true })}
                >
                  {tc("no")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-[#8C8279]" />
                {t("trainingCommitment")}
              </Label>
              <p className="text-xs text-[#8C8279]">
                {t("trainingCommitmentHint")}
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={trainingCommitment ? "default" : "outline"}
                  size="sm"
                  className={trainingCommitment ? "bg-[#2E7D52] text-white" : "border-[#E8E4DF]"}
                  onClick={() => setEducatorValue("training_commitment", true, { shouldDirty: true })}
                >
                  {tc("yes")}
                </Button>
                <Button
                  type="button"
                  variant={!trainingCommitment ? "default" : "outline"}
                  size="sm"
                  className={!trainingCommitment ? "bg-[#8C8279] text-white" : "border-[#E8E4DF]"}
                  onClick={() => setEducatorValue("training_commitment", false, { shouldDirty: true })}
                >
                  {tc("no")}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
                disabled={!isEducatorDirty || updateEducatorMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {updateEducatorMutation.isPending ? tc("saving") : tc("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
