"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useTranslations } from "next-intl"

interface DatePickerProps {
  /** ISO date (YYYY-MM-DD) — empty string means no value selected. */
  value: string
  onChange: (date: string) => void
  /**
   * Lower bound, inclusive (YYYY-MM-DD). Defaults to today (local time)
   * so users can never pick a past date.
   */
  minDate?: string
  /**
   * Upper bound, inclusive (YYYY-MM-DD). Defaults to one year out so
   * the calendar isn't endlessly navigable.
   */
  maxDate?: string
  /**
   * Days of week the educator works, using the API convention:
   * 0=Monday, 6=Sunday. If omitted, every day is selectable.
   */
  availableDaysOfWeek?: number[] | null
  /** Specific dates (YYYY-MM-DD) that must be blocked regardless of weekday. */
  blockedDates?: string[]
  placeholder?: string
  className?: string
  id?: string
}

const GAP = 4
const PANEL_HEIGHT = 360 // approximate, used for flip detection

const SAFARI_RE = /^((?!chrome|crios|android).)*safari/i

/**
 * Detects "real" Safari (excludes Chrome on iOS, which is a Safari engine
 * but reports `crios`). Hidden behind a hook so SSR doesn't render the
 * fallback path on Safari users' first paint.
 */
function useIsSafari(): boolean {
  const [isSafari, setIsSafari] = React.useState(false)
  React.useEffect(() => {
    if (typeof navigator === "undefined") return
    setIsSafari(SAFARI_RE.test(navigator.userAgent))
  }, [])
  return isSafari
}

/** Today as a YYYY-MM-DD string in local time (not UTC). */
function todayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return formatIso(d)
}

function formatIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD string in local time, dodging UTC pitfalls. */
function parseIso(iso: string): Date | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  return d
}

/** API day-of-week: Monday=0..Sunday=6. JS Date.getDay() is Sun=0..Sat=6. */
function apiDayOfWeek(d: Date): number {
  return (d.getDay() + 6) % 7
}

interface CalendarCell {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  disabled: boolean
}

function buildMonthGrid(
  year: number,
  month: number,
  options: {
    minDate: Date
    maxDate: Date
    availableDays: Set<number> | null
    blocked: Set<string>
    selected: string
    today: Date
  },
): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1)
  // Monday-first grid: shift JS Sunday=0 so Monday lands at 0.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - leadingBlanks)

  const cells: CalendarCell[] = []
  // 6 rows × 7 cols = 42 cells covers any month.
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    d.setHours(0, 0, 0, 0)
    const iso = formatIso(d)
    const inMonth = d.getMonth() === month
    const tooEarly = d < options.minDate
    const tooLate = d > options.maxDate
    const dow = apiDayOfWeek(d)
    const wrongWeekday = options.availableDays
      ? !options.availableDays.has(dow)
      : false
    const explicitBlock = options.blocked.has(iso)
    cells.push({
      iso,
      day: d.getDate(),
      inMonth,
      isToday: d.getTime() === options.today.getTime(),
      isSelected: iso === options.selected,
      disabled: tooEarly || tooLate || wrongWeekday || explicitBlock,
    })
  }
  return cells
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  availableDaysOfWeek,
  blockedDates,
  placeholder,
  className,
  id,
}: DatePickerProps) {
  const t = useTranslations("datePicker")
  const isSafari = useIsSafari()

  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [position, setPosition] = React.useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // ─── Bounds ──────────────────────────────────────────────────────────
  const today = React.useMemo(() => parseIso(todayIso())!, [])
  const min = React.useMemo(
    () => parseIso(minDate ?? todayIso()) ?? today,
    [minDate, today],
  )
  const max = React.useMemo(() => {
    const fallback = new Date(today)
    fallback.setFullYear(fallback.getFullYear() + 1)
    return parseIso(maxDate ?? formatIso(fallback)) ?? fallback
  }, [maxDate, today])

  const availableDays = React.useMemo(
    () =>
      availableDaysOfWeek && availableDaysOfWeek.length > 0
        ? new Set(availableDaysOfWeek)
        : null,
    [availableDaysOfWeek],
  )
  const blocked = React.useMemo(
    () => new Set(blockedDates ?? []),
    [blockedDates],
  )

  // ─── Visible month state ─────────────────────────────────────────────
  const [{ year, month }, setVisible] = React.useState(() => {
    const seed = parseIso(value) ?? today
    return { year: seed.getFullYear(), month: seed.getMonth() }
  })

  // When the controlled value changes externally, follow it.
  React.useEffect(() => {
    const seed = parseIso(value)
    if (!seed) return
    setVisible({ year: seed.getFullYear(), month: seed.getMonth() })
  }, [value])

  const grid = React.useMemo(
    () =>
      buildMonthGrid(year, month, {
        minDate: min,
        maxDate: max,
        availableDays,
        blocked,
        selected: value,
        today,
      }),
    [year, month, min, max, availableDays, blocked, value, today],
  )

  // ─── Positioning ─────────────────────────────────────────────────────
  const computePosition = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return null
    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - GAP
    const spaceAbove = rect.top - GAP
    const flip = spaceBelow < PANEL_HEIGHT && spaceAbove > spaceBelow
    return {
      top: flip
        ? Math.max(8, rect.top - GAP - PANEL_HEIGHT)
        : rect.bottom + GAP,
      left: rect.left,
      width: Math.max(rect.width, 320),
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    setPosition(computePosition())
    const handler = () => setPosition(computePosition())
    window.addEventListener("scroll", handler, true)
    window.addEventListener("resize", handler)
    return () => {
      window.removeEventListener("scroll", handler, true)
      window.removeEventListener("resize", handler)
    }
  }, [open, computePosition])

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

  // ─── Safari fallback ─────────────────────────────────────────────────
  // Safari's <input type="date"> is well-tested, and skinning it has a
  // history of breaking in subtle ways (especially on iPad). Per the
  // requirement, we keep the native control on Safari only.
  if (isSafari) {
    return (
      <input
        id={id}
        type="date"
        value={value}
        min={minDate ?? todayIso()}
        max={maxDate}
        onChange={(e) => onChange(e.target.value)}
        className={`flex h-10 w-full rounded-md border border-[#E8E4DF] bg-white px-3 text-sm text-[#1C2B20] outline-none focus:border-[#2E7D52] ${className || ""}`}
      />
    )
  }

  // ─── Locale-aware month/weekday labels ───────────────────────────────
  const monthLabel = React.useMemo(() => {
    return new Date(year, month, 1).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    })
  }, [year, month])

  const weekdayLabels = React.useMemo(() => {
    // Build a Mon..Sun array using locale-aware short day names.
    const base = new Date(2024, 0, 1) // Monday Jan 1, 2024
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d
        .toLocaleDateString(undefined, { weekday: "short" })
        .replace(/\.$/, "")
    })
  }, [])

  // ─── Display value (locale-aware) ────────────────────────────────────
  const displayValue = React.useMemo(() => {
    const d = parseIso(value)
    if (!d) return ""
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }, [value])

  function shiftMonth(delta: number) {
    setVisible((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      const minMonthStart = new Date(min.getFullYear(), min.getMonth(), 1)
      const maxMonthStart = new Date(max.getFullYear(), max.getMonth(), 1)
      if (next < minMonthStart || next > maxMonthStart) return prev
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const canPrev = React.useMemo(() => {
    const visibleStart = new Date(year, month, 1)
    const minStart = new Date(min.getFullYear(), min.getMonth(), 1)
    return visibleStart > minStart
  }, [year, month, min])

  const canNext = React.useMemo(() => {
    const visibleStart = new Date(year, month, 1)
    const maxStart = new Date(max.getFullYear(), max.getMonth(), 1)
    return visibleStart < maxStart
  }, [year, month, max])

  return (
    <div className={`relative ${className || ""}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-[#E8E4DF] bg-white px-3 text-sm transition-colors hover:border-[#2E7D52]/50 focus:border-[#2E7D52] focus:outline-none"
      >
        <CalendarDays className="size-4 shrink-0 text-[#8C8279]" />
        <span
          className={`flex-1 truncate text-left ${
            value ? "text-[#1C2B20]" : "text-[#8C8279]"
          }`}
        >
          {displayValue || placeholder || t("placeholder")}
        </span>
      </button>

      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t("ariaLabel")}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 1000,
            }}
            className="rounded-xl border border-[#D8EAE0] bg-white p-3 shadow-[0_12px_40px_rgba(28,43,32,0.16)]"
          >
            {/* Month header */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!canPrev}
                aria-label={t("previousMonth")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#1C2B20] transition-colors hover:bg-[#FAF8F5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold capitalize text-[#1C2B20]">
                {monthLabel}
              </div>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={!canNext}
                aria-label={t("nextMonth")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#1C2B20] transition-colors hover:bg-[#FAF8F5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekdayLabels.map((w) => (
                <div
                  key={w}
                  className="text-center text-[11px] font-medium uppercase tracking-wider text-[#8C8279]"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((cell) => {
                if (!cell.inMonth) {
                  // Render an empty placeholder so the grid stays aligned
                  // without showing prev/next month dates that would just
                  // confuse the user.
                  return <div key={cell.iso} className="h-9" />
                }
                const base =
                  "h-9 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                let stateClasses = ""
                if (cell.isSelected) {
                  stateClasses = "bg-[#2E7D52] text-white hover:bg-[#256943]"
                } else if (cell.disabled) {
                  stateClasses =
                    "text-[#C9C2B8] cursor-not-allowed line-through"
                } else if (cell.isToday) {
                  stateClasses =
                    "text-[#2E7D52] ring-1 ring-[#2E7D52]/40 hover:bg-[#E8F5EE]"
                } else {
                  stateClasses = "text-[#1C2B20] hover:bg-[#E8F5EE]"
                }
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={cell.disabled}
                    onClick={() => {
                      if (cell.disabled) return
                      onChange(cell.iso)
                      setOpen(false)
                    }}
                    aria-pressed={cell.isSelected}
                    aria-label={cell.iso}
                    className={`${base} ${stateClasses}`}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>

            {/* Legend / note for unavailable days */}
            {availableDays && (
              <p className="mt-3 text-xs text-[#8C8279]">{t("unavailableNote")}</p>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
