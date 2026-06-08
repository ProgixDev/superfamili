"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import {
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { apiGet } from "@/lib/api/client"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface DashboardLayoutProps {
  children: React.ReactNode
  navItems: NavItem[]
  notificationsHref: string
}

interface LayoutNotification {
  id: string
  is_read?: boolean
  read?: boolean
}

interface NotificationsResponse {
  data?: LayoutNotification[]
}

export function DashboardLayout({
  children,
  navItems,
  notificationsHref,
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const tc = useTranslations("common")
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)

  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // Even if signOut fails, we still redirect to login
    } finally {
      router.push("/connexion")
      router.refresh()
    }
  }

  const { data: notificationsData } = useQuery<NotificationsResponse>({
    queryKey: ["layout-notifications"],
    queryFn: () => apiGet("/notifications"),
    refetchInterval: 30000,
  })

  const unreadCount = (notificationsData?.data ?? []).filter(
    (notification) => !(notification.is_read ?? notification.read ?? false)
  ).length

  const { data: profileData } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => apiGet<{ data: any }>("/profiles/me"),
  })

  const profile = profileData?.data || (profileData as any)
  const avatarUrl = profile?.avatar_url
  const firstName = profile?.first_name || ""

  /**
   * Maps a sidebar nav href to a `data-tour` attribute value. Used by
   * the onboarding tour (react-joyride) to anchor tooltips to specific
   * nav links. Unmapped hrefs get no attribute.
   */
  function tourTargetForHref(href: string): string | undefined {
    // Normalize trailing slashes, strip locale prefix if present.
    const clean = href.replace(/^\/[a-z]{2}/, "").replace(/\/$/, "")
    switch (clean) {
      // Parent
      case "/parent/messages":
        return "messages-icon"
      // Educator
      case "/educateur/profil":
        return "profile-edit"
      case "/educateur/revenus":
        return "revenues"
      case "/educateur/disponibilites":
        return "availability"
      case "/educateur/documents":
        return "documents"
      case "/educateur/references":
        return "references"
      // Admin
      case "/admin/verifications":
        return "pending-reviews"
      case "/admin/utilisateurs":
        return "user-management"
      case "/admin":
        return "reports"
      default:
        return undefined
    }
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          const dataTour = tourTargetForHref(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              data-tour={dataTour}
              className={cn(
                "flex items-center rounded-xl transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-[#E8F5EE] text-[#2E7D52]"
                  : "text-[#8C8279] hover:bg-[#FAF8F5] hover:text-[#1A1A1A]"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#FAF8F5]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col fixed top-0 left-0 bottom-0 z-40 border-r border-[#E8E4DF] bg-white transition-all duration-200",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && (
            <Link href="/">
              <img src="/images/logo.png" alt="SuperFamili" className="h-8" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-[#8C8279] hover:text-[#1A1A1A]"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Separator />

        {/* Nav links */}
        <div className="flex flex-1 flex-col gap-4 p-3">
          <NavLinks />
        </div>

        {/* Logout */}
        <div className="border-t border-[#E8E4DF] p-3">
          <Button
            variant="ghost"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full text-[#8C8279]",
              collapsed
                ? "justify-center px-2"
                : "justify-start gap-3"
            )}
            title={collapsed ? tc("logout") : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{isLoggingOut ? tc("loggingOut") : tc("logout")}</span>}
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-200",
          collapsed ? "lg:ml-[68px]" : "lg:ml-64"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E8E4DF] bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-[#FAF8F5] lg:hidden">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-[#E8E4DF] px-6 py-4">
                  <SheetTitle>
                    <img src="/images/logo.png" alt="SuperFamili" className="h-8" />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-1 flex-col p-4">
                  <nav className="flex flex-1 flex-col gap-1">
                    {navItems.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/")
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-[#E8F5EE] text-[#2E7D52]"
                              : "text-[#8C8279] hover:bg-[#FAF8F5] hover:text-[#1A1A1A]"
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="lg:hidden">
              <img src="/images/logo.png" alt="SuperFamili" className="h-7" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell
              unreadCount={unreadCount}
              href={notificationsHref}
            />
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#E8F5EE] text-sm font-semibold text-[#2E7D52]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>

        {/* Onboarding tour overlay. Runs once per account on first
            dashboard visit; no-op afterwards unless replayed from
            settings. Rendered here so parent / educator / admin all
            get the same mount point. */}
        <OnboardingTour />
      </div>
    </div>
  )
}
