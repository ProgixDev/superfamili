'use client'

import Link from 'next/link'
import { Star, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

const GRADIENT_VARIANTS = [
  'from-[#2E7D52] to-[#26A69A]',
  'from-[#26A69A] to-[#80CBC4]',
  'from-[#81C784] to-[#A5D6A7]',
  'from-[#2E7D52] to-[#4CAF78]',
  'from-[#1B5E38] to-[#2E7D52]',
] as const

function getGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENT_VARIANTS[Math.abs(hash) % GRADIENT_VARIANTS.length]
}

function renderStars(rating: number) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i <= Math.round(rating)
              ? 'fill-[#81C784] text-[#81C784]'
              : 'text-[#D8EAE0]'
          }`}
        />
      ))}
    </span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EducatorCard({ educator }: { educator: any }) {
  const t = useTranslations('search')
  // Extract data from the real API response structure
  const profile = educator.profiles || {}
  const firstName = profile.first_name || ''
  const lastName = profile.last_name || ''
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'ED'
  const postalCode = profile.postal_code || ''
  const city = profile.city || ''
  const locationDisplay = city || postalCode || ''
  const bio = profile.bio || educator.bio_professional || ''
  const rating = Number(educator.average_rating) || 0
  const totalReviews = educator.total_reviews || 0
  const gradient = getGradient(educator.id)

  // Get services and lowest rate
  const services = educator.educator_services || []
  const serviceNames = services.map((s: any) => s.services?.name || s.name || '').filter(Boolean)
  const lowestRate = services.length > 0
    ? Math.min(...services.map((s: any) => s.hourly_rate_cents || 0))
    : 0

  return (
    <Link
      href={`/educateurs/${educator.id}`}
      data-tour="educator-card"
      className="group block overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_40px_rgba(28,43,32,0.12)]"
    >
      {/* Gradient header */}
      <div className={`relative h-[120px] bg-gradient-to-br ${gradient}`}>
        <div className="absolute -bottom-6 left-6 flex size-[72px] items-center justify-center rounded-full border-4 border-white bg-white text-xl font-bold text-[#1C2B20] shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
          {initials}
        </div>
      </div>

      {/* Card body */}
      <div className="px-6 pb-6 pt-9">
        <h3 className="text-lg font-bold text-[#1C2B20]">
          {firstName} {lastName}
        </h3>
        {locationDisplay && (
          <div className="mb-3 flex items-center gap-1 text-[13px] text-[#607060]">
            <MapPin className="size-3.5" />
            <span>{locationDisplay}</span>
            {educator.distance_km != null && educator.distance_km > 0 && (
              <span className="ml-1 text-[#2E7D52]">
                · {educator.distance_km.toFixed(1)} km
              </span>
            )}
          </div>
        )}

        {bio && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-[#607060]">
            {bio}
          </p>
        )}

        {/* Service tags */}
        {serviceNames.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {serviceNames.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-[#F4FAF6] px-3 py-1 text-xs font-medium text-[#607060]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#D8EAE0] pt-4">
          <div className="flex items-center gap-1.5">
            {renderStars(rating)}
            <span className="text-[13px] text-[#607060]">
              {rating > 0 ? rating.toFixed(1) : '--'} ({t('reviews', { count: totalReviews })})
            </span>
          </div>
          {lowestRate > 0 && (
            <div className="text-base font-bold text-[#2E7D52]">
              {(lowestRate / 100).toFixed(0)}${' '}
              <span className="text-[13px] font-normal text-[#607060]">{t('perHour')}</span>
            </div>
          )}
        </div>

        {/* Book button */}
        <button
          data-tour="reservation-button"
          className="mt-4 w-full rounded-xl bg-[#1C2B20] px-4 py-3.5 text-sm font-semibold text-white transition-colors group-hover:bg-[#2E7D52]"
        >
          {t('book')}
        </button>
      </div>
    </Link>
  )
}

export function EducatorCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
      <div className="h-[120px] animate-pulse bg-gradient-to-br from-gray-200 to-gray-100" />
      <div className="px-6 pb-6 pt-9">
        <div className="mb-2 h-5 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mb-2 h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="mb-4 h-4 w-3/4 animate-pulse rounded bg-gray-100" />
        <div className="mb-4 flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="border-t border-[#D8EAE0] pt-4">
          <div className="flex justify-between">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="mt-4 h-12 w-full animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}
