'use client'

import { Search, MapPin, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSearchStore } from '@/stores/search-store'
import { useEducatorSearch } from '@/hooks/use-educators'
import { EducatorCard, EducatorCardSkeleton } from './educator-card'
import { FilterPanel } from './filter-panel'
import { CitySelect } from './city-select'
import { useState } from 'react'

export function SearchPage() {
  const t = useTranslations('search')
  const tc = useTranslations('common')
  const store = useSearchStore()
  const { data, isLoading, isError } = useEducatorSearch()
  const [showFilters, setShowFilters] = useState(false)

  const SERVICE_TYPES = [
    { value: 'all', label: t('allServices') },
    { value: 'petite_enfance', label: t('earlyChildhood') },
    { value: 'aide_devoirs', label: t('homeworkHelp') },
    { value: 'garde_nuit', label: t('nightCare') },
    { value: 'activites', label: t('activities') },
    { value: 'besoins_speciaux', label: t('specialNeeds') },
  ]

  const SORT_OPTIONS = [
    { value: 'pertinence', label: t('relevance') },
    { value: 'distance', label: t('distance') },
    { value: 'tarif_asc', label: t('priceAsc') },
    { value: 'note', label: t('rating') },
  ] as const

  // API returns {success, data: [...], meta: {...}} via transform interceptor
  const rawData = data as any
  const educators = rawData?.data ?? []
  const meta = rawData?.meta
  const totalResults = meta?.total ?? educators.length
  const hasLocation = !!store.ville || !!store.codePostal

  function handleSearch() {
    store.setPage(1)
  }

  function handleSortChange(value: string | null) {
    if (value) store.setTri(value as typeof store.tri)
  }

  function handleServiceTypeChange(value: string | null) {
    if (!value || value === 'all') {
      store.setTypeGarde([])
    } else {
      store.setTypeGarde([value])
    }
  }

  function handleCitySelect(city: string) {
    store.setVille(city)
  }

  const sortedByLabel =
    store.tri === 'pertinence'
      ? ` · ${t('sortedByRelevance')}`
      : store.tri === 'distance'
        ? ` · ${t('sortedByDistance')}`
        : store.tri === 'tarif_asc'
          ? ` · ${t('sortedByPrice')}`
          : store.tri === 'note'
            ? ` · ${t('sortedByRating')}`
            : ''

  return (
    <div className="min-h-screen bg-[#F4FAF6]">
      {/* Search hero */}
      <div className="bg-gradient-to-br from-[#1C2B20] to-[#2E7D52] px-4 pb-12 pt-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[#80CBC4]">
            {t('searchLabel')}
          </p>
          <h1 className="mb-8 text-3xl font-bold leading-tight text-white md:text-4xl">
            {t('findIdealEducator')}
          </h1>

          {/* Search bar */}
          <div
            data-tour="search-bar"
            className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_8px_40px_rgba(28,43,32,0.12)] md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <CitySelect
                value={store.ville}
                onChange={handleCitySelect}
                placeholder={t('selectCity')}
              />
            </div>

            <div className="h-8 w-px bg-[#D8EAE0] max-md:hidden" />

            <div className="flex-1">
              <Select
                defaultValue="all"
                onValueChange={handleServiceTypeChange}
              >
                <SelectTrigger className="h-12 w-full border-0 bg-transparent text-sm shadow-none focus-visible:ring-0">
                  <SelectValue placeholder={t('serviceTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSearch}
              className="h-12 rounded-xl bg-[#2E7D52] px-8 text-sm font-semibold text-white hover:bg-[#1B5E38]"
            >
              <Search className="mr-2 size-4" />
              {t('searchButton')}
            </Button>
          </div>
        </div>
      </div>

      {/* Results area */}
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {/* Results header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1C2B20] md:text-3xl">
              {t('availableEducators')}
            </h2>
            <p className="mt-1 text-sm text-[#607060]">
              {t('results', { count: totalResults })}
              {store.ville && ` ${t('inCity', { city: store.ville })}`}
              {sortedByLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile filter toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-xl border-[#D8EAE0] lg:hidden"
            >
              <SlidersHorizontal className="mr-2 size-4" />
              {tc('filters')}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[#607060]">{tc('sortBy')}</span>
              <Select
                defaultValue="pertinence"
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="h-10 w-[180px] rounded-full border-[#D8EAE0] bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters - desktop */}
          <div className="hidden shrink-0 lg:block">
            <FilterPanel />
          </div>

          {/* Sidebar filters - mobile */}
          {showFilters && (
            <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)}>
              <div
                className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-[#F4FAF6] p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <FilterPanel />
              </div>
            </div>
          )}

          {/* Results grid */}
          <div className="flex-1">
            {!hasLocation ? (
              <div className="rounded-2xl bg-white px-8 py-16 text-center shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
                <MapPin className="mx-auto mb-4 size-12 text-[#D8EAE0]" />
                <p className="text-lg font-semibold text-[#1C2B20]">
                  {t('selectCity')}
                </p>
                <p className="mt-2 text-sm text-[#607060]">
                  {t('typeCity')}
                </p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <EducatorCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl bg-white px-8 py-16 text-center shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
                <p className="text-lg font-semibold text-[#1C2B20]">
                  {t('errorOccurred')}
                </p>
                <p className="mt-2 text-sm text-[#607060]">
                  {t('retryLater')}
                </p>
              </div>
            ) : educators.length === 0 ? (
              <div className="rounded-2xl bg-white px-8 py-16 text-center shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
                <Search className="mx-auto mb-4 size-12 text-[#D8EAE0]" />
                <p className="text-lg font-semibold text-[#1C2B20]">
                  {t('noEducatorFound')}
                </p>
                <p className="mt-2 text-sm text-[#607060]">
                  {t('widenCriteria')}
                </p>
                <Button
                  variant="outline"
                  onClick={store.resetFilters}
                  className="mt-6 rounded-xl border-[#D8EAE0]"
                >
                  {t('resetFilters')}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {educators.map((educator: any) => (
                    <EducatorCard key={educator.id} educator={educator} />
                  ))}
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={meta.page <= 1}
                      onClick={() => store.setPage(meta.page - 1)}
                      className="rounded-xl border-[#D8EAE0]"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>

                    {Array.from({ length: Math.min(meta.totalPages, 5) }).map(
                      (_, i) => {
                        const pageNum = i + 1
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pageNum === meta.page ? 'default' : 'outline'
                            }
                            size="icon"
                            onClick={() => store.setPage(pageNum)}
                            className={`rounded-xl ${
                              pageNum === meta.page
                                ? 'bg-[#2E7D52] text-white'
                                : 'border-[#D8EAE0]'
                            }`}
                          >
                            {pageNum}
                          </Button>
                        )
                      }
                    )}

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={meta.page >= meta.totalPages}
                      onClick={() => store.setPage(meta.page + 1)}
                      className="rounded-xl border-[#D8EAE0]"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
