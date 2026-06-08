'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Star,
  MapPin,
  ShieldCheck,
  Clock,
  Calendar,
  MessageSquare,
  Users,
  Award,
  CheckCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { Educator, Review, Disponibilite } from '@/types/api'

function getInitials(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

function renderStars(rating: number | null, size = 'size-4') {
  const r = rating ?? 0
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${
            i <= Math.round(r) ? 'fill-[#81C784] text-[#81C784]' : 'text-[#D8EAE0]'
          }`}
        />
      ))}
    </span>
  )
}

function StarBreakdown({ reviews }: { reviews: Review[] }) {
  const counts = [0, 0, 0, 0, 0]
  reviews.forEach((r) => {
    const idx = Math.min(Math.max(Math.round(r.note) - 1, 0), 4)
    counts[idx]++
  })

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = counts[star - 1] ?? 0
        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-[#607060]">{star}</span>
            <Star className="size-3.5 fill-[#81C784] text-[#81C784]" />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F4FAF6]">
              <div
                className="h-full rounded-full bg-[#81C784] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs text-[#607060]">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function AvailabilityGrid({
  disponibilites,
}: {
  disponibilites: Disponibilite[]
}) {
  const t = useTranslations('educatorProfileView.daysShort')

  const daySlots = new Map<string, Disponibilite[]>()
  disponibilites.forEach((d) => {
    const existing = daySlots.get(d.jour) ?? []
    existing.push(d)
    daySlots.set(d.jour, existing)
  })

  const days = [
    { key: 'lundi', label: t('mon') },
    { key: 'mardi', label: t('tue') },
    { key: 'mercredi', label: t('wed') },
    { key: 'jeudi', label: t('thu') },
    { key: 'vendredi', label: t('fri') },
    { key: 'samedi', label: t('sat') },
    { key: 'dimanche', label: t('sun') },
  ]

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const slots = daySlots.get(day.key) ?? []
        const hasSlots = slots.length > 0

        return (
          <div key={day.key} className="text-center">
            <div className="mb-2 text-xs font-semibold text-[#607060]">
              {day.label}
            </div>
            <div
              className={`rounded-xl px-2 py-3 text-xs ${
                hasSlots
                  ? 'bg-[#E8F5EE] text-[#2E7D52]'
                  : 'bg-[#F4FAF6] text-[#D8EAE0]'
              }`}
            >
              {hasSlots
                ? slots.map((s, idx) => (
                    <div key={idx}>
                      {s.heureDebut.slice(0, 5)}-{s.heureFin.slice(0, 5)}
                    </div>
                  ))
                : '--'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface EducatorProfileViewProps {
  educator: Educator
  reviews: Review[]
}

export function EducatorProfileView({
  educator,
  reviews,
}: EducatorProfileViewProps) {
  const t = useTranslations('educatorProfileView')
  const ts = useTranslations('search')
  const initials = getInitials(educator.prenom, educator.nom)

  return (
    <div className="min-h-screen bg-[#F4FAF6]">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {/* Back button */}
        <Link
          href="/recherche"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#607060] transition-colors hover:text-[#1C2B20]"
        >
          <ArrowLeft className="size-4" />
          {t('backToResults')}
        </Link>

        {/* Hero card */}
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0] md:flex md:gap-8">
          {/* Avatar */}
          <div className="mb-6 flex shrink-0 items-start md:mb-0">
            <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-[#2E7D52] to-[#26A69A] text-3xl font-bold text-white shadow-lg md:size-28">
              {initials}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#1C2B20] md:text-3xl">
              {educator.prenom} {educator.nom}
            </h1>
            {educator.typeGarde.length > 0 && (
              <p className="mt-1 text-sm text-[#607060]">
                {educator.typeGarde.join(' \u00B7 ')}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 text-sm text-[#607060]">
                <MapPin className="size-4" />
                {educator.ville}
                {educator.codePostal ? `, ${educator.codePostal}` : ''}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[#607060]">
                {renderStars(educator.note, 'size-3.5')}
                <span>
                  {educator.note !== null ? educator.note.toFixed(1) : '--'} (
                  {ts('reviews', { count: educator.nombreAvis })})
                </span>
              </div>
              {educator.verifie && (
                <div className="flex items-center gap-1.5 text-sm text-[#2E7D52]">
                  <ShieldCheck className="size-4" />
                  {t('identityVerified')}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-[#607060]">
                <Clock className="size-4" />
                {t('respondsWithinHour')}
              </div>
            </div>

            {/* Tags */}
            {educator.typeGarde.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {educator.typeGarde.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F4FAF6] px-3 py-1 text-xs font-medium text-[#607060]"
                  >
                    {tag}
                  </span>
                ))}
                {educator.langues.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full bg-[#F4FAF6] px-3 py-1 text-xs font-medium text-[#607060]"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rate + Actions */}
          <div className="mt-6 shrink-0 text-right md:mt-0">
            <div className="font-serif text-4xl font-bold text-[#2E7D52]">
              {educator.tarifHoraire.toFixed(0)}$
            </div>
            <div className="mb-6 text-sm text-[#607060]">{t('perHour')}</div>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="rounded-full border-[#D8EAE0] px-6 text-sm"
              >
                <MessageSquare className="mr-2 size-4" />
                {t('sendMessage')}
              </Button>
              <Link
                href={`/reservations/nouvelle?educateur=${educator.id}`}
                className="inline-flex items-center justify-center rounded-full bg-[#2E7D52] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1B5E38]"
              >
                <Calendar className="mr-2 size-4" />
                {t('book')}
              </Link>
            </div>
          </div>
        </div>

        {/* Grid: About + Reviews */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* About */}
          <div className="rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
            <h2 className="mb-4 text-lg font-bold text-[#1C2B20]">
              {t('about')}
            </h2>
            {educator.bio && (
              <p className="text-sm leading-relaxed text-[#607060]">
                {educator.bio}
              </p>
            )}

            {/* Stats grid */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#F4FAF6] p-5 text-center">
                <div className="font-serif text-3xl font-bold text-[#1C2B20]">
                  {educator.anneesExperience}
                </div>
                <div className="text-xs text-[#607060]">
                  {t('yearsExperienceLabel')}
                </div>
              </div>
              <div className="rounded-2xl bg-[#F4FAF6] p-5 text-center">
                <div className="font-serif text-3xl font-bold text-[#1C2B20]">
                  {educator.nombreAvis}
                </div>
                <div className="text-xs text-[#607060]">
                  {t('familiesHelped')}
                </div>
              </div>
              <div className="rounded-2xl bg-[#F4FAF6] p-5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Award className="size-5 text-[#2E7D52]" />
                  <span className="font-serif text-3xl font-bold text-[#1C2B20]">
                    {educator.certifications.length}
                  </span>
                </div>
                <div className="text-xs text-[#607060]">{t('certifications')}</div>
              </div>
              <div className="rounded-2xl bg-[#F4FAF6] p-5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="size-5 text-[#2E7D52]" />
                </div>
                <div className="text-xs text-[#607060]">
                  {educator.verifie ? t('verifiedProfile') : t('notVerified')}
                </div>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
            <h2 className="mb-4 text-lg font-bold text-[#1C2B20]">
              {t('recentReviews')}
            </h2>

            {reviews.length > 0 && (
              <div className="mb-6">
                <StarBreakdown reviews={reviews} />
              </div>
            )}

            <div className="space-y-5">
              {reviews.length === 0 ? (
                <p className="text-sm text-[#607060]">
                  {t('noReviews')}
                </p>
              ) : (
                reviews.slice(0, 5).map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-[#F4FAF6] pb-5 last:border-0 last:pb-0"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-[#F4FAF6] text-sm font-semibold text-[#1C2B20]">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#1C2B20]">
                          {review.parent?.prenom ?? t('parentFallback')}{' '}
                          {review.parent?.nom
                            ? `${review.parent.nom.charAt(0)}.`
                            : ''}
                        </div>
                        <div className="flex items-center gap-2">
                          {renderStars(review.note, 'size-3')}
                        </div>
                      </div>
                    </div>
                    {review.commentaire && (
                      <p className="text-sm leading-relaxed text-[#607060]">
                        {review.commentaire}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Services & Pricing */}
        {educator.typeGarde.length > 0 && (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
            <h2 className="mb-4 text-lg font-bold text-[#1C2B20]">
              {t('servicesAndRates')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#D8EAE0]">
                    <th className="pb-3 font-semibold text-[#1C2B20]">
                      {t('service')}
                    </th>
                    <th className="pb-3 text-right font-semibold text-[#1C2B20]">
                      {t('rate')}
                    </th>
                    <th className="pb-3 text-right font-semibold text-[#1C2B20]">
                      {t('ageRange')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {educator.typeGarde.map((service) => (
                    <tr
                      key={service}
                      className="border-b border-[#F4FAF6] last:border-0"
                    >
                      <td className="py-3 text-[#1C2B20]">{service}</td>
                      <td className="py-3 text-right font-semibold text-[#2E7D52]">
                        {educator.tarifHoraire.toFixed(2).replace('.', ',')} $/h
                      </td>
                      <td className="py-3 text-right text-[#607060]">
                        {educator.ageMinimum}-{educator.ageMaximum} {t('years')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Availability */}
        {educator.disponibilites.length > 0 && (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
            <h2 className="mb-4 text-lg font-bold text-[#1C2B20]">
              {t('availability')}
            </h2>
            <AvailabilityGrid disponibilites={educator.disponibilites} />
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-[#1C2B20] to-[#2E7D52] px-8 py-12 text-center shadow-[0_8px_40px_rgba(28,43,32,0.12)]">
          <h2 className="text-2xl font-bold text-white">
            {t('readyToBook', { name: educator.prenom })}
          </h2>
          <p className="max-w-md text-sm text-white/70">
            {t('bookDescription')}
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10"
            >
              <MessageSquare className="mr-2 size-4" />
              {t('sendMessage')}
            </Button>
            <Link
              href={`/reservations/nouvelle?educateur=${educator.id}`}
              className="inline-flex items-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#2E7D52] transition-colors hover:bg-white/90"
            >
              <Calendar className="mr-2 size-4" />
              {t('book')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
