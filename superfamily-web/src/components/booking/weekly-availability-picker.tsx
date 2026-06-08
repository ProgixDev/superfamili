"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

// Day-of-week values use JS convention: Sun=0, Mon=1..Sat=6 — same as
// what `educator_availability.day_of_week` actually stores in the DB
// (set by the educator's own disponibilites page).
const DAYS: Array<{ index: number; key: string }> = [
  { index: 1, key: "mon" },
  { index: 2, key: "tue" },
  { index: 3, key: "wed" },
  { index: 4, key: "thu" },
  { index: 5, key: "fri" },
  { index: 6, key: "sat" },
  { index: 0, key: "sun" },
]

// Default visible band — matches the educator availability page so the two
// views feel consistent. We trim further at render time based on the
// educator's actual earliest/latest declared hour.
const DEFAULT_HOURS = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
] as const

export interface AvailabilitySlot {
  day_of_week: number // JS convention: Sun=0..Sat=6
  start_time: string // "HH:MM"
  end_time: string // "HH:MM"
  is_available?: boolean
}

export interface BusyRange {
  /** ISO timestamp. */
  start: string
  /** ISO timestamp. */
  end: string
}

export interface WeeklySelection {
  /** YYYY-MM-DD of the picked day. */
  date: string
  /** "HH:MM" inclusive start. */
  startTime: string
  /** "HH:MM" exclusive end. */
  endTime: string
}

interface WeeklyAvailabilityPickerProps {
  /** Educator's recurring weekly slots. */
  availability: AvailabilitySlot[]
  /** Active bookings on the educator's calendar within the visible window. */
  busyRanges: BusyRange[]
  /** Date (YYYY-MM-DD) of the Monday of the visible week. */
  weekStart: string
  /** Called when the user clicks the prev/next-week arrows. */
  onWeekChange: (newWeekStart: string) => void
  /** Earliest pickable date (YYYY-MM-DD) — defaults to today. */
  minDate?: string
  /** Currently-selected range, or null. */
  value: WeeklySelection | null
  onChange: (selection: WeeklySelection | null) => void
  /** Optional loading flag for the busy-range fetch. */
  busyLoading?: boolean
}

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

function todayIso(): string {
  const d = new Date()
  return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseIso(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns Monday of the ISO week containing `iso`. */
function mondayOf(iso: string): string {
  const d = parseIso(iso) ?? new Date()
  const day = d.getDay() // Sun=0..Sat=6
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Adds a number of days to a YYYY-MM-DD. */
function addDays(iso: string, days: number): string {
  const d = parseIso(iso) ?? new Date()
  d.setDate(d.getDate() + days)
  return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate())
}

function hourToHHMM(h: number): string {
  return `${pad2(h)}:00`
}

function hhmmToHour(hhmm: string): number {
  return Number(hhmm.split(":")[0])
}

// ───────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────

export function WeeklyAvailabilityPicker({
  availability,
  busyRanges,
  weekStart,
  onWeekChange,
  minDate,
  value,
  onChange,
  busyLoading = false,
}: WeeklyAvailabilityPickerProps) {
  const t = useTranslations("weeklyPicker")

  const today = React.useMemo(() => todayIso(), [])
  const minIso = minDate ?? today
  // The current local hour — used to block today's already-elapsed
  // hours so a parent can't pick a slot in the past.
  const currentHour = React.useMemo(() => new Date().getHours(), [])

  // ─── Date columns for the visible week ─────────────────────────────
  const columns = React.useMemo(() => {
    // weekStart is the Monday; build Mon..Sun (matching the DAYS order).
    return DAYS.map((d, i) => {
      const iso = addDays(weekStart, i)
      const date = parseIso(iso)!
      return {
        ...d,
        iso,
        date,
        dayOfWeek: date.getDay(), // JS convention
        // Disabled if before today (parents can't pick a past date).
        beforeMin: iso < minIso,
      }
    })
  }, [weekStart, minIso])

  // ─── Active hour band (compress to educator's working hours) ──────
  // If the educator publishes 09:00–17:00, render rows 09..16 instead
  // of the full 07..21 band. Always include at least 09..17 so the grid
  // doesn't collapse if the educator hasn't set anything yet.
  const hours = React.useMemo(() => {
    if (availability.length === 0) {
      return DEFAULT_HOURS.slice() as number[]
    }
    let earliest = 24
    let latest = 0
    for (const slot of availability) {
      if (slot.is_available === false) continue
      const start = hhmmToHour(slot.start_time)
      const end = hhmmToHour(slot.end_time)
      if (start < earliest) earliest = start
      if (end > latest) latest = end
    }
    if (earliest >= latest) return DEFAULT_HOURS.slice() as number[]
    // Pad each end by 1h for visual context.
    earliest = Math.max(0, earliest - 1)
    latest = Math.min(24, latest + 1)
    const out: number[] = []
    for (let h = earliest; h < latest; h++) out.push(h)
    return out
  }, [availability])

  // ─── Lookup: is hour H on day-of-week D in availability? ───────────
  const availableMap = React.useMemo(() => {
    // Map: day_of_week -> Set<hour>
    const map = new Map<number, Set<number>>()
    for (const slot of availability) {
      if (slot.is_available === false) continue
      const start = hhmmToHour(slot.start_time)
      const end = hhmmToHour(slot.end_time)
      let set = map.get(slot.day_of_week)
      if (!set) {
        set = new Set<number>()
        map.set(slot.day_of_week, set)
      }
      for (let h = start; h < end; h++) set.add(h)
    }
    return map
  }, [availability])

  // ─── Lookup: is (date, hour) occupied by a booking? ────────────────
  const busyMap = React.useMemo(() => {
    // Map: dateIso -> Set<hour>
    const map = new Map<string, Set<number>>()
    for (const range of busyRanges) {
      const startMs = Date.parse(range.start)
      const endMs = Date.parse(range.end)
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue
      // Step in 1h increments — bookings could span multiple hours/days.
      for (let t = startMs; t < endMs; t += 60 * 60 * 1000) {
        const d = new Date(t)
        const iso = isoFromParts(d.getFullYear(), d.getMonth(), d.getDate())
        const hour = d.getHours()
        let set = map.get(iso)
        if (!set) {
          set = new Set<number>()
          map.set(iso, set)
        }
        set.add(hour)
      }
    }
    return map
  }, [busyRanges])

  // ─── Cell state machine ────────────────────────────────────────────
  type CellState = "available" | "busy" | "unavailable" | "selected"

  const cellStateFor = React.useCallback(
    (iso: string, dayOfWeek: number, hour: number, beforeMin: boolean): CellState => {
      if (
        value &&
        value.date === iso &&
        hour >= hhmmToHour(value.startTime) &&
        hour < hhmmToHour(value.endTime)
      ) {
        return "selected"
      }
      if (beforeMin) return "unavailable"
      // Today's hours that have already passed are still in the
      // educator's recurring availability, but we obviously can't book
      // them — treat them as unavailable.
      if (iso === today && hour <= currentHour) return "unavailable"
      const dayHours = availableMap.get(dayOfWeek)
      if (!dayHours || !dayHours.has(hour)) return "unavailable"
      const dayBusy = busyMap.get(iso)
      if (dayBusy && dayBusy.has(hour)) return "busy"
      return "available"
    },
    [availableMap, busyMap, value, today, currentHour],
  )

  // ─── Quick scan: does this week have ANY clickable cell? ──────────
  // Used to surface a helpful "navigate forward" banner when the
  // parent lands on a week that's mostly past or fully booked, so
  // they don't think the educator has no availability at all.
  const hasAnyAvailableThisWeek = React.useMemo(() => {
    for (const col of columns) {
      for (const hour of hours) {
        const state = (() => {
          if (col.beforeMin) return "unavailable"
          if (col.iso === today && hour <= currentHour) return "unavailable"
          const dayHours = availableMap.get(col.dayOfWeek)
          if (!dayHours || !dayHours.has(hour)) return "unavailable"
          const dayBusy = busyMap.get(col.iso)
          if (dayBusy && dayBusy.has(hour)) return "busy"
          return "available"
        })()
        if (state === "available") return true
      }
    }
    return false
  }, [columns, hours, availableMap, busyMap, today, currentHour])

  // ─── Click handler — enforces consecutive selection ────────────────
  const handleCellClick = React.useCallback(
    (iso: string, hour: number, state: CellState) => {
      // Can't pick non-clickable cells.
      if (state === "busy" || state === "unavailable") return

      // Same-day selection extension / shrink / restart logic.
      if (!value || value.date !== iso) {
        // Different day (or no selection yet) — start fresh.
        onChange({
          date: iso,
          startTime: hourToHHMM(hour),
          endTime: hourToHHMM(hour + 1),
        })
        return
      }

      const lo = hhmmToHour(value.startTime)
      const hi = hhmmToHour(value.endTime) // exclusive — so hi-1 is the last selected hour
      const selectedHours: number[] = []
      for (let h = lo; h < hi; h++) selectedHours.push(h)

      // Click on the same single cell: deselect.
      if (selectedHours.length === 1 && selectedHours[0] === hour) {
        onChange(null)
        return
      }
      // Click on the lower edge: shrink from the bottom.
      if (hour === selectedHours[0] && selectedHours.length > 1) {
        onChange({
          date: iso,
          startTime: hourToHHMM(selectedHours[1]),
          endTime: hourToHHMM(hi),
        })
        return
      }
      // Click on the upper edge: shrink from the top.
      if (
        hour === selectedHours[selectedHours.length - 1] &&
        selectedHours.length > 1
      ) {
        onChange({
          date: iso,
          startTime: hourToHHMM(lo),
          endTime: hourToHHMM(selectedHours[selectedHours.length - 1]),
        })
        return
      }
      // Click adjacent below the current range: extend down.
      if (hour === lo - 1) {
        onChange({
          date: iso,
          startTime: hourToHHMM(hour),
          endTime: hourToHHMM(hi),
        })
        return
      }
      // Click adjacent above the current range: extend up.
      if (hour === hi) {
        onChange({
          date: iso,
          startTime: hourToHHMM(lo),
          endTime: hourToHHMM(hour + 1),
        })
        return
      }
      // Click somewhere in the middle of an existing range, OR somewhere
      // non-contiguous: drop the old range and start a new 1h selection.
      // Enforces the "consecutive only" rule.
      onChange({
        date: iso,
        startTime: hourToHHMM(hour),
        endTime: hourToHHMM(hour + 1),
      })
    },
    [value, onChange],
  )

  // ─── Week navigation ───────────────────────────────────────────────
  const canGoPrev = React.useMemo(() => {
    // We can navigate to the previous week as long as the next-Monday is
    // still ≥ minIso (clamping at the week containing today's Monday).
    return weekStart > mondayOf(minIso)
  }, [weekStart, minIso])

  const weekLabel = React.useMemo(() => {
    const start = parseIso(weekStart)
    if (!start) return ""
    const end = parseIso(addDays(weekStart, 6))!
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
    return `${fmt(start)} – ${fmt(end)}`
  }, [weekStart])

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Week navigation header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          disabled={!canGoPrev}
          aria-label={t("previousWeek")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E8E4DF] text-[#1C2B20] transition-colors hover:bg-[#FAF8F5] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-sm font-semibold text-[#1C2B20]">
          {weekLabel}
          {busyLoading && (
            <Loader2 className="ml-2 inline size-3.5 animate-spin text-[#8C8279]" />
          )}
        </div>
        <button
          type="button"
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          aria-label={t("nextWeek")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E8E4DF] text-[#1C2B20] transition-colors hover:bg-[#FAF8F5]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Empty-week hint — shown when nothing in this week is clickable
          (typically: late in the week when all visible days are past,
          or every available slot is already booked). Tells the parent
          to use the next-week arrow instead of giving up. */}
      {!hasAnyAvailableThisWeek && availability.length > 0 && (
        <div className="rounded-lg bg-[#FFF3EE] p-3 text-sm text-[#C45B3E]">
          {t("noSlotsThisWeek")}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day header row */}
          <div className="mb-1 grid grid-cols-[64px_repeat(7,1fr)] gap-1">
            <div />
            {columns.map((col) => {
              const isToday = col.iso === today
              return (
                <div
                  key={col.iso}
                  className={`flex flex-col items-center text-xs font-semibold ${
                    isToday ? "text-[#2E7D52]" : "text-[#1C2B20]"
                  }`}
                >
                  <span className="capitalize">
                    {col.date
                      .toLocaleDateString(undefined, { weekday: "short" })
                      .replace(/\.$/, "")}
                  </span>
                  <span
                    className={`mt-0.5 text-[11px] ${
                      isToday ? "text-[#2E7D52]" : "text-[#8C8279]"
                    }`}
                  >
                    {col.date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Hour rows */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[64px_repeat(7,1fr)] gap-1"
            >
              <div className="flex items-center text-[11px] text-[#8C8279]">
                {hourToHHMM(hour)}
              </div>
              {columns.map((col) => {
                const state = cellStateFor(
                  col.iso,
                  col.dayOfWeek,
                  hour,
                  col.beforeMin,
                )
                const base =
                  "h-8 rounded-md border transition-colors text-[10px] font-medium"
                let cls = ""
                let label = ""
                switch (state) {
                  case "selected":
                    cls =
                      "border-[#2E7D52] bg-[#2E7D52] text-white cursor-pointer"
                    break
                  case "available":
                    cls =
                      "border-[#2E7D52]/30 bg-[#E8F5EE] text-[#2E7D52] hover:border-[#2E7D52] hover:bg-[#2E7D52]/15 cursor-pointer"
                    break
                  case "busy":
                    cls =
                      "border-[#E8E4DF] bg-[#E8E4DF] text-[#8C8279] cursor-not-allowed"
                    label = t("occupied")
                    break
                  case "unavailable":
                    cls =
                      "border-[#E8E4DF]/60 bg-white text-transparent cursor-not-allowed"
                    break
                }
                return (
                  <button
                    key={`${col.iso}-${hour}`}
                    type="button"
                    onClick={() => handleCellClick(col.iso, hour, state)}
                    disabled={state === "busy" || state === "unavailable"}
                    aria-label={`${col.iso} ${hourToHHMM(hour)} ${state}`}
                    className={`${base} ${cls}`}
                    title={
                      state === "busy"
                        ? t("occupied")
                        : state === "unavailable"
                          ? t("unavailableTooltip")
                          : undefined
                    }
                  >
                    {label || ""}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#8C8279]">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-[#2E7D52]/30 bg-[#E8F5EE]" />
          {t("legendAvailable")}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-[#E8E4DF] bg-[#E8E4DF]" />
          {t("legendOccupied")}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-[#2E7D52] bg-[#2E7D52]" />
          {t("legendSelected")}
        </div>
      </div>
    </div>
  )
}

// Re-export helpers consumers may want for navigation defaults / range math.
export const weeklyPickerUtils = {
  todayIso,
  mondayOf,
  addDays,
}
