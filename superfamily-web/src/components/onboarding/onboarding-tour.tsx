"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Joyride, EVENTS, STATUS, type Step } from "react-joyride"
import { useTranslations } from "next-intl"
import { apiGet } from "@/lib/api/client"
import {
  useOnboarding,
  useUpdateOnboarding,
} from "@/hooks/use-onboarding"

type Role = "parent" | "educator" | "admin"

interface ProfileMe {
  data?: { role?: Role | string }
}

/**
 * Shape of one tour step definition. `target` matches the `data-tour`
 * attribute set on the DOM element elsewhere in the app.
 */
interface TourStep {
  target: string
  contentKey: string // i18n key under `onboarding.<role>.*`
  placement?: Step["placement"]
}

const PARENT_STEPS: TourStep[] = [
  { target: '[data-tour="search-bar"]', contentKey: "parent.searchBar" },
  { target: '[data-tour="educator-card"]', contentKey: "parent.educatorCard" },
  { target: '[data-tour="add-child"]', contentKey: "parent.addChild" },
  {
    target: '[data-tour="reservation-button"]',
    contentKey: "parent.reservationButton",
  },
  {
    target: '[data-tour="messages-icon"]',
    contentKey: "parent.messagesIcon",
  },
]

const EDUCATOR_STEPS: TourStep[] = [
  { target: '[data-tour="kyc-step"]', contentKey: "educator.kycStep" },
  { target: '[data-tour="profile-edit"]', contentKey: "educator.profileEdit" },
  { target: '[data-tour="documents"]', contentKey: "educator.documents" },
  { target: '[data-tour="references"]', contentKey: "educator.references" },
  { target: '[data-tour="revenues"]', contentKey: "educator.revenues" },
  {
    target: '[data-tour="availability"]',
    contentKey: "educator.availability",
  },
]

const ADMIN_STEPS: TourStep[] = [
  {
    target: '[data-tour="pending-reviews"]',
    contentKey: "admin.pendingReviews",
  },
  {
    target: '[data-tour="user-management"]',
    contentKey: "admin.userManagement",
  },
  { target: '[data-tour="reports"]', contentKey: "admin.reports" },
]

function stepsForRole(role: Role | undefined): TourStep[] {
  if (role === "parent") return PARENT_STEPS
  if (role === "educator") return EDUCATOR_STEPS
  if (role === "admin") return ADMIN_STEPS
  return []
}

/**
 * Filters a step list down to only steps whose DOM target currently
 * exists on the page. Prevents react-joyride from firing
 * `error:target_not_found` for every missing step. A role's full step
 * list spans multiple pages; the user sees whichever subset applies
 * to the current page, and the tour picks up where it left off on the
 * next page they visit.
 */
function filterAvailableSteps(steps: TourStep[]): TourStep[] {
  if (typeof document === "undefined") return []
  return steps.filter((s) => document.querySelector(s.target) !== null)
}

/**
 * Root-level onboarding tutorial. Auto-runs the first time a user lands
 * on any dashboard page after signup. Skipping or completing the tour
 * persists via `PATCH /onboarding/me`, so it won't reappear on the
 * next login unless the user replays it from settings.
 *
 * Mounted inside `DashboardLayout` so it runs for all three roles
 * without having to touch each layout file individually.
 *
 * This uses the `react-joyride` v3 Component API — the library is
 * named-export only (no default), advertises SSR-safe support, and
 * uses `onEvent: EventHandler` for event callbacks (v2's `callback`
 * prop and `CallBackProps` type have been replaced).
 */
export function OnboardingTour() {
  const t = useTranslations("onboarding")
  const tLocale = useTranslations("onboarding.locale")

  // Look up the user's role via /profiles/me. Gracefully disables the
  // tour if the user isn't authenticated yet.
  const { data: profileResp } = useQuery<ProfileMe>({
    queryKey: ["profile-me"],
    queryFn: () => apiGet("/profiles/me"),
    retry: false,
    refetchOnWindowFocus: false,
  })
  const role = profileResp?.data?.role as Role | undefined

  // Enable the onboarding query only once we know there's a profile.
  const { data: onboarding } = useOnboarding(!!role)
  const updateOnboarding = useUpdateOnboarding()

  const [availableSteps, setAvailableSteps] = React.useState<TourStep[]>([])
  const [run, setRun] = React.useState(false)

  // Re-evaluate available steps whenever role / onboarding change.
  // `requestAnimationFrame` gives the page a tick to mount its
  // data-tour elements before we probe the DOM.
  React.useEffect(() => {
    if (!role) return
    if (!onboarding) return
    if (onboarding.tutorial_skipped || onboarding.tutorial_completed_at) return

    const raf = window.requestAnimationFrame(() => {
      const all = stepsForRole(role)
      const available = filterAvailableSteps(all).filter(
        (s) => !onboarding.completed_steps.includes(s.target),
      )
      setAvailableSteps(available)
      setRun(available.length > 0)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [role, onboarding])

  // Convert internal step list to react-joyride's Step[] with
  // localized content. Memoized so reference identity is stable.
  const joyrideSteps: Step[] = React.useMemo(() => {
    return availableSteps.map<Step>((s, i) => ({
      target: s.target,
      content: (
        <div className="space-y-1">
          {i === 0 && (
            <p className="font-heading text-sm font-bold">{t("welcome")}</p>
          )}
          <p className="text-sm">{t(s.contentKey)}</p>
          {i === availableSteps.length - 1 && (
            <p className="mt-2 text-xs text-[#8C8279]">{t("finalStep")}</p>
          )}
        </div>
      ),
      disableBeacon: true,
      placement: s.placement ?? "auto",
    }))
  }, [availableSteps, t])

  // v3 API: a single `onEvent` handler receives every lifecycle event.
  // We care about three of them:
  //   - `step:after`   → record the step target in completed_steps
  //   - `tour:end`     → terminal state; check status for finished/skipped
  //   - `error:target_not_found` → ignored (we pre-filter, but keep the
  //     handler quiet if something races).
  const handleEvent = React.useCallback(
    (data: { type: string; status?: string; step?: { target?: unknown } }) => {
      const type = data.type

      if (type === EVENTS.STEP_AFTER) {
        const target = data.step?.target
        if (typeof target !== "string") return
        const completedSoFar = new Set(onboarding?.completed_steps ?? [])
        completedSoFar.add(target)
        updateOnboarding.mutate({
          completed_steps: Array.from(completedSoFar),
        })
        return
      }

      if (type === EVENTS.TOUR_END) {
        setRun(false)
        if (data.status === STATUS.FINISHED) {
          updateOnboarding.mutate({ completed: true })
        } else if (data.status === STATUS.SKIPPED) {
          updateOnboarding.mutate({ skipped: true })
        }
      }
    },
    [onboarding, updateOnboarding],
  )

  if (!run || joyrideSteps.length === 0) return null

  return (
    <Joyride
      steps={joyrideSteps.map((step) => ({
        ...step,
        // v3 moved locale into per-step options — apply localized
        // button labels to every step. We also set them at the
        // top-level `options` prop below so future additions pick
        // them up.
        locale: {
          back: tLocale("back"),
          close: tLocale("close"),
          last: tLocale("last"),
          next: tLocale("next"),
          skip: tLocale("skip"),
          open: tLocale("open"),
        },
      }))}
      run={run}
      continuous
      scrollToFirstStep
      // v3 moved `showSkipButton` / `showProgress` under `options`
      // (they're now `buttons` array + `showProgress` flag). Theme
      // colors also live here — `styles` is flat in v3.
      options={{
        primaryColor: "#2E7D52", // SuperFamily green
        textColor: "#1A1A1A",
        backgroundColor: "#FFFFFF",
        arrowColor: "#FFFFFF",
        overlayColor: "rgba(28, 43, 32, 0.6)",
        zIndex: 10000,
        showProgress: true,
        buttons: ["back", "skip", "primary"],
      }}
      onEvent={handleEvent}
    />
  )
}
