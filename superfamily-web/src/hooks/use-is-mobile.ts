"use client"

import * as React from "react"

/**
 * Returns `true` when the current device is likely a phone or tablet.
 *
 * Combines two signals:
 *   1. A `max-width: 768px` media query — catches viewport-based
 *      mobile browsing, including desktop browsers resized narrow.
 *   2. A user-agent sniff — catches tablets in landscape (iPad in
 *      landscape is >768px wide but is still a touch device where
 *      opening Didit in-place makes sense).
 *
 * Either signal flips the hook to `true`.
 *
 * SSR-safe: returns `false` during server rendering and then
 * re-evaluates on the client, so the first client paint is always
 * consistent with the server.
 *
 * Written as a tiny custom hook instead of pulling in
 * `react-device-detect` (~20KB) because the two lines of logic we
 * need are easy to maintain and leave one fewer dependency to keep
 * current.
 */
const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i

const MOBILE_MAX_WIDTH = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)

    const evaluate = () => {
      const viewportMobile = mql.matches
      const uaMobile = MOBILE_UA_REGEX.test(navigator.userAgent)
      setIsMobile(viewportMobile || uaMobile)
    }

    evaluate()
    mql.addEventListener("change", evaluate)
    return () => mql.removeEventListener("change", evaluate)
  }, [])

  return isMobile
}
