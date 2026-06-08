"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"
import { Footer } from "./footer"

const DASHBOARD_SEGMENTS = ["/parent", "/educateur", "/admin"]

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // With locale prefix, pathname can be /fr/parent/... or /parent/...
  const isDashboard = DASHBOARD_SEGMENTS.some(
    (p) => pathname.startsWith(p) || pathname.match(new RegExp(`^/[a-z]{2}${p}`))
  )

  if (isDashboard) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <div className="pt-[76px] flex-1">{children}</div>
      <Footer />
    </>
  )
}
