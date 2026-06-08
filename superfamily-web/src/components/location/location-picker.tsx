"use client"

import * as React from "react"
import { MapPin, Navigation, Search, X, Loader2, Check, Save } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { apiGet } from "@/lib/api/client"
import dynamic from "next/dynamic"

const MapView = dynamic(
  () => import("./map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center rounded-xl bg-[#FAF8F5]" style={{ height: 300 }}>
        <Loader2 className="size-6 animate-spin text-[#8C8279]" />
      </div>
    ),
  }
)

interface LocationPickerProps {
  latitude?: number | null
  longitude?: number | null
  address?: string
  label?: string
  onSave: (location: {
    latitude: number
    longitude: number
    address: string
    city?: string
  }) => Promise<void>
}

interface PendingLocation {
  latitude: number
  longitude: number
  address: string
  city?: string
}

async function geocodeQuery(query: string): Promise<PendingLocation | null> {
  // Try our backend first
  try {
    const res = await apiGet<any>("/educators/geocode", { q: query })
    const data = res?.data || res
    if (data?.latitude && data?.longitude) {
      return {
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        address: data.address || query,
        city: data.city || "",
      }
    }
  } catch {}

  // Fallback to Nominatim — try query as-is first, then with ", Canada"
  for (const q of [query, query + ", Canada"]) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ca&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { "Accept-Language": "fr" } }
      )
      const data = await res.json()
      if (data?.[0]) {
        const r = data[0]
        return {
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          address: r.display_name,
          city: r.address?.city || r.address?.town || r.address?.village || "",
        }
      }
    } catch {}
  }

  return null
}

async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; city: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "fr" } }
    )
    const data = await res.json()
    return {
      address: data.display_name || "",
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || "",
    }
  } catch {
    return { address: "", city: "" }
  }
}

export function LocationPicker({
  latitude,
  longitude,
  address,
  label,
  onSave,
}: LocationPickerProps) {
  const t = useTranslations("locationPicker")
  const tc = useTranslations("common")
  const tp = useTranslations("profile")
  const effectiveLabel = label ?? tp("locationLabel")
  const [search, setSearch] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [locating, setLocating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [searchError, setSearchError] = React.useState("")
  const [pending, setPending] = React.useState<PendingLocation | null>(null)

  const savedAddress = address || ""
  const displayLat = pending?.latitude ?? latitude ?? 45.5017
  const displayLng = pending?.longitude ?? longitude ?? -73.5673
  const hasChanges = pending !== null

  async function handleSearch() {
    if (!search.trim() || search.trim().length < 2) return
    setSearching(true)
    setSearchError("")

    const result = await geocodeQuery(search.trim())
    if (result) {
      setPending(result)
      setSearch("")
    } else {
      setSearchError(t("addressNotFound"))
    }
    setSearching(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { address: addr, city } = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        setPending({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, address: addr, city })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleMapClick(newLat: number, newLng: number) {
    const { address: addr, city } = await reverseGeocode(newLat, newLng)
    setPending({ latitude: newLat, longitude: newLng, address: addr, city })
  }

  async function handleSave() {
    if (!pending) return
    setSaving(true)
    try {
      await onSave(pending)
      setPending(null)
    } finally {
      setSaving(false)
    }
  }

  const displayAddress = pending?.address || savedAddress

  return (
    <div className="space-y-3">
      {/* Use current location */}
      <Button
        type="button"
        variant="outline"
        onClick={useCurrentLocation}
        disabled={locating}
        className="w-full gap-2 border-[#D8EAE0] text-[#2E7D52] hover:bg-[#E8F5EE] hover:text-[#2E7D52]"
      >
        {locating ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
        {locating ? t("locating") : t("useMyLocation", { label: effectiveLabel })}
      </Button>

      {/* Address / postal code search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8C8279]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchError("") }}
            onKeyDown={handleKeyDown}
            placeholder={t("addressPlaceholder")}
            className="h-11 w-full rounded-xl border border-[#D8EAE0] bg-white pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-[#8C8279] focus:border-[#2E7D52]"
          />
          {search && !searching && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchError("") }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-4 text-[#8C8279] hover:text-[#1C2B20]" />
            </button>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={searching || !search.trim()}
          className="h-11 shrink-0 gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          {t("searchButton")}
        </Button>
      </div>

      {/* Error */}
      {searchError && (
        <p className="text-sm text-red-600">{searchError}</p>
      )}

      {/* Map */}
      <div className="overflow-hidden rounded-xl border border-[#D8EAE0]">
        <MapView lat={displayLat} lng={displayLng} onMapClick={handleMapClick} />
      </div>
      <p className="text-xs text-[#8C8279]">{t("clickMapHint")}</p>

      {/* Address display */}
      {displayAddress && (
        <div className={`flex items-start gap-2 rounded-lg p-3 ${hasChanges ? "bg-[#FFF8E1] border border-[#FFD54F]" : "bg-[#E8F5EE]"}`}>
          <MapPin className={`mt-0.5 size-4 shrink-0 ${hasChanges ? "text-[#F59E0B]" : "text-[#2E7D52]"}`} />
          <div className="flex-1">
            {hasChanges && (
              <p className="mb-1 text-xs font-semibold text-[#F59E0B]">{t("newPositionUnsaved")}</p>
            )}
            <p className={`text-sm ${hasChanges ? "text-[#92400E]" : "text-[#2E7D52]"}`}>{displayAddress}</p>
          </div>
        </div>
      )}

      {/* Confirm / Cancel */}
      {hasChanges && (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPending(null)}
            className="flex-1 border-[#E8E4DF]"
          >
            <X className="mr-2 size-4" />
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 gap-2 bg-[#2E7D52] text-white hover:bg-[#256943]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? t("saving") : t("confirmAndSave")}
          </Button>
        </div>
      )}

      {/* Saved state */}
      {!hasChanges && savedAddress && (
        <div className="flex items-center gap-2 text-sm text-[#2E7D52]">
          <Check className="size-4" />
          <span>{t("positionSaved")}</span>
        </div>
      )}
    </div>
  )
}
