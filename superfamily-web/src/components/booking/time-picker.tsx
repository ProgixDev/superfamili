"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Clock } from "lucide-react"
import { useTranslations } from "next-intl"

export interface TimeWindow {
  /** "HH:MM" — inclusive start. */
  start: string
  /** "HH:MM" — exclusive end. */
  end: string
}

interface TimePickerProps {
  /** "HH:MM" — empty string when unset. */
  value: string
  onChange: (time: string) => void
  /**
   * Allowed time windows. If omitted or empty, every slot is selectable.
   * Typically the educator's working hours for the selected day.
   */
  windows?: TimeWindow[]
  /** Step in minutes between slots — defaults to 30. */
  stepMinutes?: number
  /** Inclusive lower bound in "HH:MM" (e.g. start time when picking end). */
  min?: string
  /** Inclusive upper bound in "HH:MM". */
  max?: string
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

const GAP = 4
const PANEL_HEIGHT = 280

const SAFARI_RE = /^((?!chrome|crios|android).)*safari/i

function useIsSafari(): boolean {
  const [isSafari, setIsSafari] = React.useState(false)
  React.useEffect(() => {
    if (typeof navigator === "undefined") return
    setIsSafari(SAFARI_RE.test(navigator.userAgent))
  }, [])
  return isSafari
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/**
 * Locale-aware display label for a time. Example: "09:30" → "9:30 AM"
 * in en-US, "09:30" in fr-CA.
 */
function formatTime(hhmm: string): string {
  if (!hhmm) return ""
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date()
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Build the list of selectable slots, intersected with `windows`, `min`,
 * `max`, and quantized to `stepMinutes`. If no windows are given the
 * full day (00:00–23:30) is offered.
 */
function buildSlots(
  windows: TimeWindow[] | undefined,
  stepMinutes: number,
  min?: string,
  max?: string,
): string[] {
  const minLimit = min ? toMinutes(min) : 0
  const maxLimit = max ? toMinutes(max) : 24 * 60
  const effective: TimeWindow[] =
    windows && windows.length > 0 ? windows : [{ start: "00:00", end: "23:59" }]

  const slots = new Set<number>()
  for (const w of effective) {
    const start = Math.max(toMinutes(w.start), minLimit)
    const end = Math.min(toMinutes(w.end), maxLimit)
    // Round start up to the next step to keep slot times tidy (e.g. 9:00,
    // 9:30, ... rather than 9:13).
    const firstSlot = Math.ceil(start / stepMinutes) * stepMinutes
    for (let t = firstSlot; t <= end; t += stepMinutes) {
      slots.add(t)
    }
  }
  return Array.from(slots)
    .sort((a, b) => a - b)
    .map(toHHMM)
}

/**
 * Time picker rendered as a scrollable list of slots, snapped to the
 * educator's working hours for the active day. Falls back to the native
 * `<input type="time">` on Safari (per requirement) since Safari's
 * native control is well-tested and avoids visual quirks.
 */
export function TimePicker({
  value,
  onChange,
  windows,
  stepMinutes = 30,
  min,
  max,
  placeholder,
  className,
  id,
  disabled,
}: TimePickerProps) {
  const t = useTranslations("timePicker")
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

  const slots = React.useMemo(
    () => buildSlots(windows, stepMinutes, min, max),
    [windows, stepMinutes, min, max],
  )

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
      width: Math.max(rect.width, 180),
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

  // When opening, scroll to the currently-selected slot so it's visible.
  React.useEffect(() => {
    if (!open || !panelRef.current || !value) return
    const id = requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        `[data-time-slot="${value}"]`,
      )
      el?.scrollIntoView({ block: "center" })
    })
    return () => cancelAnimationFrame(id)
  }, [open, value])

  // ─── Safari fallback ────────────────────────────────────────────────
  if (isSafari) {
    return (
      <input
        id={id}
        type="time"
        value={value}
        min={min}
        max={max}
        step={stepMinutes * 60}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`flex h-10 w-full rounded-md border border-[#E8E4DF] bg-white px-3 text-sm text-[#1C2B20] outline-none focus:border-[#2E7D52] disabled:cursor-not-allowed disabled:bg-[#FAF8F5] ${className || ""}`}
      />
    )
  }

  const displayValue = value ? formatTime(value) : ""
  const noSlots = slots.length === 0

  return (
    <div className={`relative ${className || ""}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen((o) => !o)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-[#E8E4DF] bg-white px-3 text-sm transition-colors hover:border-[#2E7D52]/50 focus:border-[#2E7D52] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#FAF8F5]"
      >
        <Clock className="size-4 shrink-0 text-[#8C8279]" />
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
            role="listbox"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: PANEL_HEIGHT,
              zIndex: 1000,
            }}
            className="overflow-y-auto overscroll-contain rounded-xl border border-[#D8EAE0] bg-white py-1 shadow-[0_12px_40px_rgba(28,43,32,0.16)]"
          >
            {noSlots ? (
              <p className="px-3 py-4 text-center text-sm text-[#8C8279]">
                {t("noSlots")}
              </p>
            ) : (
              slots.map((slot) => {
                const isSelected = slot === value
                return (
                  <button
                    key={slot}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-time-slot={slot}
                    onClick={() => {
                      onChange(slot)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-[#2E7D52] text-white"
                        : "text-[#1C2B20] hover:bg-[#E8F5EE]"
                    }`}
                  >
                    <span>{formatTime(slot)}</span>
                    <span
                      className={`text-xs ${
                        isSelected ? "text-white/80" : "text-[#8C8279]"
                      }`}
                    >
                      {slot}
                    </span>
                  </button>
                )
              })
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
