"use client"

import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  Bell,
  User,
  Settings,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations("dashboardNav")

  const navItems = [
    { href: "/parent/tableau-de-bord", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/parent/reservations", label: t("bookings"), icon: Calendar },
    { href: "/parent/enfants", label: t("children"), icon: Users },
    { href: "/parent/messages", label: t("messages"), icon: MessageCircle },
    { href: "/parent/notifications", label: t("notifications"), icon: Bell },
    { href: "/parent/profil", label: t("profile"), icon: User },
    { href: "/parent/parametres", label: t("settings"), icon: Settings },
  ]

  return (
    <DashboardLayout
      navItems={navItems}
      notificationsHref="/parent/notifications"
    >
      {children}
    </DashboardLayout>
  )
}
