"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { MapPin, Check, ChevronsUpDown, X, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { apiGet } from "@/lib/api/client"

interface City {
  id: string
  name: string
  province: string
}

interface CitySelectProps {
  value: string
  onChange: (city: string) => void
  placeholder?: string
  className?: string
}

// Vertical gap between the trigger and the dropdown.
const GAP = 4
// Maximum height of the dropdown list panel.
const DROPDOWN_MAX_HEIGHT = 320
// Height of the search-input row inside the dropdown — used to keep the
// list area predictable when computing internal scroll bounds.
const SEARCH_ROW_HEIGHT = 52

interface DropdownPosition {
  top: number
  left: number
  width: number
  // When true, the dropdown is rendered above the trigger because there
  // wasn't enough room below it in the viewport.
  flipped: boolean
  // Effective max-height after clamping to the visible viewport. Always
  // <= DROPDOWN_MAX_HEIGHT.
  maxHeight: number
}

/**
 * City picker used in the booking flow and the signup form.
 *
 * The dropdown is rendered through a portal at `document.body` with
 * fixed positioning so it can't be clipped by ancestor `overflow:hidden`
 * containers (e.g. the shared `<Card>` component). Positioning is
 * recomputed on scroll/resize and the panel flips above the trigger
 * when there isn't enough room below it. The internal list owns its
 * own scrollbar and uses `overscroll-contain` so wheel events don't
 * leak to the page underneath.
 */
export function CitySelect({
  value,
  onChange,
  placeholder,
  className,
}: CitySelectProps) {
  const t = useTranslations("search")
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [position, setPosition] = React.useState<DropdownPosition | null>(null)
  const [highlighted, setHighlighted] = React.useState(-1)
  const [mounted, setMounted] = React.useState(false)

  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const effectivePlaceholder = placeholder ?? t("cityPlaceholder")

  // ─── Data ────────────────────────────────────────────────────────────
  const { data: citiesRes, isLoading } = useQuery<unknown>({
    queryKey: ["cities-list"],
    queryFn: () => apiGet("/educators/cities"),
    staleTime: 1000 * 60 * 60, // 1h — the city list barely changes
  })

  const cities: City[] = React.useMemo(() => {
    const raw =
      (citiesRes as { data?: unknown })?.data ?? (citiesRes as unknown) ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .map((c) => {
        const row = c as { id?: string; name?: string; province?: string }
        return {
          id: String(row.id ?? row.name ?? ""),
          name: String(row.name ?? ""),
          province: String(row.province ?? ""),
        }
      })
      .filter((c) => c.name.length > 0)
  }, [citiesRes])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return cities
    const q = search.trim().toLowerCase()
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q),
    )
  }, [cities, search])

  // ─── Portal mount guard ──────────────────────────────────────────────
  // createPortal needs a DOM target; defer until after first client render
  // so SSR doesn't choke.
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // ─── Position calculation ────────────────────────────────────────────
  const computePosition = React.useCallback((): DropdownPosition | null => {
    const trigger = triggerRef.current
    if (!trigger) return null
    const rect = trigger.getBoundingClientRect()

    const viewportH = window.innerHeight
    const spaceBelow = viewportH - rect.bottom - GAP
    const spaceAbove = rect.top - GAP

    // Decide whether to flip. Only flip if there's clearly more room
    // above and below is too cramped (< ~200px).
    const flipped = spaceBelow < 200 && spaceAbove > spaceBelow

    const maxHeight = Math.min(
      DROPDOWN_MAX_HEIGHT,
      Math.max(180, flipped ? spaceAbove : spaceBelow),
    )

    const top = flipped
      ? Math.max(8, rect.top - GAP - maxHeight)
      : rect.bottom + GAP

    return {
      top,
      left: rect.left,
      width: rect.width,
      flipped,
      maxHeight,
    }
  }, [])

  // Open/close: recompute position whenever the dropdown is opened, and
  // keep it in sync with scroll/resize while open.
  React.useEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    setPosition(computePosition())

    const handler = () => setPosition(computePosition())
    window.addEventListener("scroll", handler, true) // capture so nested scrollers also update
    window.addEventListener("resize", handler)
    return () => {
      window.removeEventListener("scroll", handler, true)
      window.removeEventListener("resize", handler)
    }
  }, [open, computePosition])

  // Focus the search box once the panel is mounted.
  React.useEffect(() => {
    if (open) {
      // Defer to next frame so the input exists.
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  // Close on outside click — covers both the trigger and the portal panel.
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Reset highlight when the visible list changes.
  React.useEffect(() => {
    setHighlighted(-1)
  }, [search, open])

  // ─── Keyboard ────────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (
      e.key === "Enter" &&
      highlighted >= 0 &&
      filtered[highlighted]
    ) {
      e.preventDefault()
      commitSelection(filtered[highlighted].name)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
    }
  }

  function commitSelection(name: string) {
    onChange(name)
    setOpen(false)
    setSearch("")
  }

  // Scroll the highlighted item into view inside the list.
  React.useEffect(() => {
    if (highlighted < 0 || !panelRef.current) return
    const el = panelRef.current.querySelector<HTMLElement>(
      `[data-city-index="${highlighted}"]`,
    )
    el?.scrollIntoView({ block: "nearest" })
  }, [highlighted])

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className={`relative ${className || ""}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-12 w-full items-center gap-2 rounded-xl border border-[#D8EAE0] bg-white px-3 text-sm transition-colors hover:border-[#2E7D52]/50"
      >
        <MapPin className="size-4 shrink-0 text-[#8C8279]" />
        <span
          className={`flex-1 truncate text-left ${
            value ? "text-[#1C2B20]" : "text-[#8C8279]"
          }`}
        >
          {value || effectivePlaceholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={t("clearCity")}
            className="rounded-full p-1 text-[#8C8279] hover:bg-[#F4FAF6] hover:text-[#1C2B20]"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                onChange("")
              }
            }}
          >
            <X className="size-4" />
          </span>
        ) : (
          <ChevronsUpDown className="size-4 shrink-0 text-[#8C8279]" />
        )}
      </button>

      {/* Portal-rendered dropdown panel */}
      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              zIndex: 1000,
            }}
            className="flex flex-col overflow-hidden rounded-xl border border-[#D8EAE0] bg-white shadow-[0_12px_40px_rgba(28,43,32,0.16)]"
          >
            {/* Search input — pinned to the top of the panel. */}
            <div
              className="shrink-0 border-b border-[#E8E4DF] p-2"
              style={{ height: SEARCH_ROW_HEIGHT }}
            >
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("searchCityPlaceholder")}
                className="h-full w-full rounded-lg bg-[#FAF8F5] px-3 text-sm outline-none placeholder:text-[#8C8279]"
              />
            </div>

            {/* Scrollable city list. `overscroll-contain` prevents the
                wheel from chaining to the page once the list ends. */}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              role="presentation"
            >
              {isLoading && cities.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-[#8C8279]">
                  <Loader2 className="size-4 animate-spin" />
                  {t("loadingCities")}
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[#8C8279]">
                  {t("noCityFound")}
                </p>
              ) : (
                filtered.map((city, i) => {
                  const isSelected = value === city.name
                  const isHighlighted = i === highlighted
                  return (
                    <button
                      key={city.id}
                      type="button"
                      data-city-index={i}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => commitSelection(city.name)}
                      onMouseEnter={() => setHighlighted(i)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                        isHighlighted
                          ? "bg-[#E8F5EE]"
                          : isSelected
                            ? "bg-[#FAF8F5]"
                            : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <MapPin className="size-3.5 shrink-0 text-[#8C8279]" />
                      <span className="flex-1 truncate font-medium text-[#1C2B20]">
                        {city.name}
                      </span>
                      <span className="shrink-0 text-xs text-[#8C8279]">
                        {city.province}
                      </span>
                      {isSelected && (
                        <Check className="size-4 shrink-0 text-[#2E7D52]" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
