"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { IMaskInput } from "react-imask"
import { useTranslations } from "next-intl"
import {
  Users,
  Plus,
  Check,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client"
import { FeatureConsentModal } from "@/components/consents/feature-consent-modal"
import { useRequiredConsents } from "@/hooks/use-consents"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── Types ──────────────────────────────────────────────────────────

interface ReferenceRow {
  id: string
  educator_id: string
  full_name: string
  relationship: string | null
  phone: string
  email: string | null
  address: string
  testimonial: string
  verified: boolean
  verified_at: string | null
  created_at: string
}

interface ListResponse {
  data: ReferenceRow[]
}

const SUGGESTED_REFERENCES = 2
const MAX_REFERENCES = 5

/** Keys used both as <Select> values and as i18n keys under `references.relationships`. */
const RELATIONSHIP_KEYS = [
  "former_employer",
  "childcare_parent",
  "colleague",
  "long_time_friend",
  "family_member",
  "other",
] as const

// ─── Client-side schema (mirrors backend CreateReferenceDto) ─────────
//
// We intentionally keep the schema inside the page component so the
// error messages can be localized via useTranslations. The backend
// runs the same checks via class-validator — this just means users
// see errors immediately instead of after a round-trip.

function buildSchema(t: ReturnType<typeof useTranslations>) {
  return z.object({
    full_name: z
      .string()
      .min(2, t("form.fullNameTooShort"))
      .max(100, t("form.fullNameTooLong"))
      .trim(),
    relationship: z.string().optional(),
    phone: z
      .string()
      .min(1, t("form.required"))
      // Same regex as the backend DTO — accepts +1 XXX XXX XXXX,
      // (XXX) XXX-XXXX, XXX-XXX-XXXX and loose variants.
      .regex(
        /^(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/,
        t("form.phoneInvalid"),
      ),
    email: z
      .string()
      .email(t("form.emailInvalid"))
      .optional()
      .or(z.literal("")),
    address: z.string().min(5, t("form.addressTooShort")).max(300).trim(),
    testimonial: z
      .string()
      .min(50, t("form.testimonialTooShort"))
      .max(1000, t("form.testimonialTooLong"))
      .refine(
        (value) =>
          !/(https?:\/\/|www\.|\.com|\.ca|\.fr|\.org|\.net)/i.test(value),
        { message: t("form.testimonialContainsUrl") },
      )
      .refine((value) => !/[\w.+-]+@[\w-]+\.[\w-]+/.test(value), {
        message: t("form.testimonialContainsEmail"),
      }),
  })
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

// ─── Page ───────────────────────────────────────────────────────────

export default function EducatorReferencesPage() {
  const t = useTranslations("references")
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<ListResponse>({
    queryKey: ["references", "me"],
    queryFn: () => apiGet("/educators/me/references"),
  })

  const references: ReferenceRow[] = data?.data ?? []
  const filled = references.length
  const reachedMax = filled >= MAX_REFERENCES
  const hasSuggested = filled >= SUGGESTED_REFERENCES

  // References are optional now. The form opens only when the educator
  // explicitly clicks the add button.
  const [formOpen, setFormOpen] = React.useState<boolean>(false)
  const [editTarget, setEditTarget] = React.useState<ReferenceRow | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ReferenceRow | null>(
    null,
  )

  // Consent gate — the reference_contact consent must be accepted
  // before the form is shown. We check the required-consents list and
  // keep the form hidden (behind the modal) until the user accepts.
  const { data: requiredConsents } = useRequiredConsents()
  const referenceContactAccepted = React.useMemo(() => {
    if (!requiredConsents) return false
    return (
      requiredConsents.find((c) => c.consent_type === "reference_contact")
        ?.already_accepted ?? false
    )
  }, [requiredConsents])

  const [consentModalOpen, setConsentModalOpen] = React.useState(false)

  const requestAddReference = () => {
    setEditTarget(null)
    if (!referenceContactAccepted) {
      setConsentModalOpen(true)
      return
    }
    setFormOpen(true)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/educators/me/references/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references", "me"] })
      toast.success(t("form.deletedToast"))
      setDeleteTarget(null)
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Error"),
  })

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">
          {t("pageTitle")}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-16">
      <div data-tour="references" className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EE]">
            <Users className="h-5 w-5 text-[#2E7D52]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1A1A1A] md:text-3xl">
              {t("pageTitle")}
            </h1>
            <p className="mt-1 text-sm text-[#8C8279]">{t("pageIntro")}</p>
          </div>
        </div>
      </div>

      {/* Progress banner */}
      <div
        className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
          hasSuggested
            ? "border-[#2E7D52]/30 bg-[#E8F5EE]"
            : "border-[#E8E4DF] bg-[#FAF8F5]"
        }`}
      >
        {hasSuggested ? (
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#2E7D52]" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#8C8279]" />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${
              hasSuggested ? "text-[#1B5E38]" : "text-[#1A1A1A]"
            }`}
          >
            {t("progress", { filled, required: SUGGESTED_REFERENCES })}
          </p>
          <p
            className={`mt-1 text-xs ${
              hasSuggested ? "text-[#1B5E38]/80" : "text-[#8C8279]"
            }`}
          >
            {hasSuggested ? t("suggestedComplete") : t("optionalHint")}
          </p>
        </div>
      </div>

      {/* Existing references */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {references.map((ref, idx) => (
            <ReferenceCard
              key={ref.id}
              reference={ref}
              index={idx + 1}
              total={references.length}
              onEdit={() => {
                setEditTarget(ref)
                setFormOpen(true)
              }}
              onDelete={() => setDeleteTarget(ref)}
            />
          ))}
        </div>
      )}

      {/* Form */}
      {formOpen && !reachedMax && (
        <Card className="mt-6 border-[#E8E4DF] bg-white">
          <CardContent className="pt-4">
            <h2 className="mb-4 font-heading text-lg font-semibold text-[#1A1A1A]">
              {t("counterLabel", {
                current: editTarget
                  ? references.findIndex((r) => r.id === editTarget.id) + 1
                  : filled + 1,
                total: Math.max(SUGGESTED_REFERENCES, filled + 1),
              })}
            </h2>
            <ReferenceForm
              initial={editTarget ?? undefined}
              onCancel={() => {
                setFormOpen(false)
                setEditTarget(null)
              }}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ["references", "me"] })
                setFormOpen(false)
                setEditTarget(null)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Add-another button (only when form is closed and below max) */}
      {!formOpen && !reachedMax && (
        <div className="mt-6">
          <Button
            onClick={requestAddReference}
            variant="outline"
            className="w-full gap-2 border-[#E8E4DF]"
          >
            <Plus className="h-4 w-4" />
            {t("addAnother")}
          </Button>
        </div>
      )}

      {reachedMax && (
        <p className="mt-6 rounded-xl bg-[#FAF8F5] p-4 text-center text-sm text-[#8C8279]">
          {t("maxReached")}
        </p>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
            <DialogDescription>{t("deleteDialog.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-[#E8E4DF]"
            >
              {t("form.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("deleteDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reference contact consent gate. References are optional, so the
          modal only opens when the educator explicitly adds one. */}
      <FeatureConsentModal
        consentType="reference_contact"
        open={consentModalOpen && !referenceContactAccepted}
        onClose={() => setConsentModalOpen(false)}
        onAccepted={() => {
          setConsentModalOpen(false)
          setFormOpen(true)
          queryClient.invalidateQueries({ queryKey: ["consents", "required"] })
        }}
      />
    </div>
  )
}

// ─── ReferenceCard ──────────────────────────────────────────────────

function ReferenceCard({
  reference,
  index,
  total,
  onEdit,
  onDelete,
}: {
  reference: ReferenceRow
  index: number
  total: number
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useTranslations("references")

  return (
    <Card className="border-[#E8E4DF] bg-white">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1A1A1A]">
                {reference.full_name}
              </h3>
              {reference.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2 py-0.5 text-xs font-medium text-[#1B5E38]">
                  <Check className="h-3 w-3" />
                  {t("statusVerified")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2 py-0.5 text-xs font-medium text-[#92400E]">
                  <Clock className="h-3 w-3" />
                  {t("statusPending")}
                </span>
              )}
            </div>
            {reference.relationship && (
              <p className="text-sm text-[#8C8279]">
                {reference.relationship}
              </p>
            )}
            <p className="mt-1 text-xs text-[#8C8279]">
              {t("counterLabel", { current: index, total })}
            </p>
            <p className="mt-2 text-sm text-[#1A1A1A]">📞 {reference.phone}</p>
            {reference.email && (
              <p className="text-sm text-[#1A1A1A]">✉️ {reference.email}</p>
            )}
            <p className="mt-1 text-xs text-[#8C8279]">
              📍 {reference.address}
            </p>
            <blockquote className="mt-3 border-l-2 border-[#E8E4DF] pl-3 text-sm italic text-[#8C8279]">
              «{reference.testimonial}»
            </blockquote>
          </div>

          {/* Edit / delete only when not yet verified. */}
          {!reference.verified && (
            <div className="flex shrink-0 flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-[#E8E4DF]"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("editButton")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-[#E8E4DF] text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("deleteButton")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── ReferenceForm ──────────────────────────────────────────────────

function ReferenceForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: ReferenceRow
  onCancel: () => void
  onSaved: () => void
}) {
  const t = useTranslations("references")
  const schema = React.useMemo(() => buildSchema(t), [t])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initial?.full_name ?? "",
      relationship: initial?.relationship ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
      testimonial: initial?.testimonial ?? "",
    },
  })

  const phoneValue = watch("phone")
  const testimonialValue = watch("testimonial") ?? ""

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        full_name: values.full_name.trim(),
        relationship: values.relationship || undefined,
        phone: values.phone,
        email: values.email?.trim() || undefined,
        address: values.address.trim(),
        testimonial: values.testimonial.trim(),
      }

      if (initial) {
        await apiPatch(`/educators/me/references/${initial.id}`, payload)
        toast.success(t("form.updatedToast"))
      } else {
        await apiPost("/educators/me/references", payload)
        toast.success(t("form.savedToast"))
      }
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error"
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Full name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">{t("form.fullNameLabel")}</Label>
        <Input
          id="full_name"
          placeholder={t("form.fullNamePlaceholder")}
          className="border-[#E8E4DF]"
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="text-xs text-red-600">{errors.full_name.message}</p>
        )}
      </div>

      {/* Relationship */}
      <div className="space-y-2">
        <Label>{t("form.relationshipLabel")}</Label>
        <Select
          value={watch("relationship") || ""}
          onValueChange={(v) =>
            setValue("relationship", v ?? "", { shouldDirty: true })
          }
        >
          <SelectTrigger className="border-[#E8E4DF]">
            <SelectValue placeholder={t("form.relationshipPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_KEYS.map((key) => (
              <SelectItem key={key} value={t(`relationships.${key}`)}>
                {t(`relationships.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Phone (masked) */}
      <div className="space-y-2">
        <Label htmlFor="phone">{t("form.phoneLabel")}</Label>
        <IMaskInput
          id="phone"
          mask="(000) 000-0000"
          value={phoneValue ?? ""}
          onAccept={(value: string) =>
            setValue("phone", value, { shouldDirty: true, shouldValidate: true })
          }
          placeholder={t("form.phonePlaceholder")}
          className="flex h-10 w-full rounded-md border border-[#E8E4DF] bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {errors.phone && (
          <p className="text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* Email (optional) */}
      <div className="space-y-2">
        <Label htmlFor="email">{t("form.emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t("form.emailPlaceholder")}
          className="border-[#E8E4DF]"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">{t("form.addressLabel")}</Label>
        <Input
          id="address"
          placeholder={t("form.addressPlaceholder")}
          className="border-[#E8E4DF]"
          {...register("address")}
        />
        {errors.address && (
          <p className="text-xs text-red-600">{errors.address.message}</p>
        )}
      </div>

      {/* Testimonial (with character counter) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="testimonial">{t("form.testimonialLabel")}</Label>
          <span
            className={`text-xs ${
              testimonialValue.length >= 50 && testimonialValue.length <= 1000
                ? "text-[#8C8279]"
                : "text-red-600"
            }`}
          >
            {t("form.testimonialCounter", {
              count: testimonialValue.length,
              max: 1000,
            })}
          </span>
        </div>
        <Textarea
          id="testimonial"
          rows={5}
          className="border-[#E8E4DF]"
          {...register("testimonial")}
        />
        <p className="text-xs text-[#8C8279]">{t("form.testimonialHint")}</p>
        {errors.testimonial && (
          <p className="text-xs text-red-600">{errors.testimonial.message}</p>
        )}
      </div>

      {/* Submit / cancel */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-[#E8E4DF]"
        >
          {t("form.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#2E7D52] text-white hover:bg-[#256943]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("form.submitting")}
            </>
          ) : (
            t("form.submit")
          )}
        </Button>
      </div>
    </form>
  )
}
