'use client'

import { Star, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
// Using native range input instead of shadcn Slider (Next.js 16 compat)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSearchStore } from '@/stores/search-store'

export function FilterPanel() {
  const t = useTranslations('search')
  const store = useSearchStore()

  const AGE_GROUPS = [
    { value: '0-1', label: t('ageInfants') },
    { value: '1-3', label: t('ageToddlers') },
    { value: '3-6', label: t('agePreschool') },
    { value: '6-12', label: t('ageSchoolAge') },
  ]

  function handleGenderChange(value: string | null) {
    store.setQuery(!value || value === 'all' ? '' : value)
  }

  function handlePriceChange(value: number | readonly number[]) {
    const values = Array.isArray(value) ? value : [value]
    store.setTarifMin(values[0] ?? null)
    store.setTarifMax(values[1] ?? null)
  }

  function handleDistanceChange(value: number | readonly number[]) {
    const values = Array.isArray(value) ? value : [value]
    store.setDistance(values[0] ?? null)
  }

  function handleRatingClick(rating: number) {
    store.setQuery(
      store.query.includes(`rating:${rating}`)
        ? store.query.replace(`rating:${rating}`, '').trim()
        : `${store.query} rating:${rating}`.trim()
    )
  }

  function handleSpecialNeedsToggle() {
    const current = store.typeGarde
    if (current.includes('besoins_speciaux')) {
      store.setTypeGarde(current.filter((t) => t !== 'besoins_speciaux'))
    } else {
      store.setTypeGarde([...current, 'besoins_speciaux'])
    }
  }

  function handleAgeGroupToggle(value: string) {
    const ageRange = value.split('-')
    const min = parseInt(ageRange[0] ?? '0', 10)
    const max = parseInt(ageRange[1] ?? '12', 10)
    store.setAgeEnfantMin(min)
    store.setAgeEnfantMax(max)
  }

  const priceMin = store.tarifMin ?? 10
  const priceMax = store.tarifMax ?? 60
  const distanceVal = store.distance ?? 25

  return (
    <aside className="w-full space-y-6 rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0] lg:w-72">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#1C2B20]">{t('filters')}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={store.resetFilters}
          className="text-xs text-[#607060] hover:text-[#2E7D52]"
        >
          <RotateCcw className="mr-1 size-3" />
          {t('reset')}
        </Button>
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-[#607060]">
          {t('gender')}
        </Label>
        <Select defaultValue="all" onValueChange={handleGenderChange}>
          <SelectTrigger className="h-10 w-full rounded-xl border-[#D8EAE0]">
            <SelectValue placeholder={t('genderAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('genderAll')}</SelectItem>
            <SelectItem value="femme">{t('genderFemale')}</SelectItem>
            <SelectItem value="homme">{t('genderMale')}</SelectItem>
            <SelectItem value="autre">{t('genderOther')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price range */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-[#607060]">
          {t('hourlyRate')}
        </Label>
        <input
          type="range"
          min={10}
          max={60}
          value={priceMax}
          onChange={(e) => handlePriceChange([priceMin, Number(e.target.value)])}
          className="w-full accent-[#2E7D52]"
        />
        <div className="flex items-center justify-between text-xs text-[#607060]">
          <span>{priceMin},00 $/h</span>
          <span>{priceMax},00 $/h</span>
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-[#607060]">
          {t('minRating')}
        </Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleRatingClick(rating)}
              className="rounded-lg p-1 transition-colors hover:bg-[#F4FAF6]"
            >
              <Star
                className={`size-5 ${
                  rating <= 4
                    ? 'fill-[#81C784] text-[#81C784]'
                    : 'text-[#D8EAE0]'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Distance */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-[#607060]">
          {t('maxDistance')}
        </Label>
        <input
          type="range"
          min={1}
          max={50}
          value={distanceVal}
          onChange={(e) => handleDistanceChange([Number(e.target.value)])}
          className="w-full accent-[#2E7D52]"
        />
        <div className="text-xs text-[#607060]">{distanceVal} km</div>
      </div>

      {/* Special needs */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={store.typeGarde.includes('besoins_speciaux')}
            onChange={handleSpecialNeedsToggle}
            className="size-4 rounded border-[#D8EAE0] text-[#2E7D52] accent-[#2E7D52]"
          />
          <span className="text-sm text-[#1C2B20]">{t('specialNeedsLabel')}</span>
        </label>
      </div>

      {/* Age groups */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-[#607060]">
          {t('ageGroup')}
        </Label>
        <div className="space-y-2">
          {AGE_GROUPS.map((group) => (
            <label key={group.value} className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                onChange={() => handleAgeGroupToggle(group.value)}
                className="size-4 rounded border-[#D8EAE0] text-[#2E7D52] accent-[#2E7D52]"
              />
              <span className="text-sm text-[#1C2B20]">{group.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  )
}
