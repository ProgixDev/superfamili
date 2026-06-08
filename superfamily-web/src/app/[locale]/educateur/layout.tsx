"use client"

import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Clock,
  DollarSign,
  MessageCircle,
  Star,
  Bell,
  User,
  FileText,
  Users,
  Settings,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function EducatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations("dashboardNav")

  const navItems = [
    { href: "/educateur/tableau-de-bord", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/educateur/reservations", label: t("bookings"), icon: Calendar },
    { href: "/educateur/services", label: t("services"), icon: Briefcase },
    { href: "/educateur/disponibilites", label: t("availability"), icon: Clock },
    { href: "/educateur/revenus", label: t("revenue"), icon: DollarSign },
    { href: "/educateur/messages", label: t("messages"), icon: MessageCircle },
    { href: "/educateur/avis", label: t("reviews"), icon: Star },
    { href: "/educateur/notifications", label: t("notifications"), icon: Bell },
    { href: "/educateur/documents", label: t("documents"), icon: FileText },
    { href: "/educateur/references", label: t("references"), icon: Users },
    { href: "/educateur/profil", label: t("profile"), icon: User },
    { href: "/educateur/parametres", label: t("settings"), icon: Settings },
  ]

  return (
    <DashboardLayout
      navItems={navItems}
      notificationsHref="/educateur/notifications"
    >
      {children}
    </DashboardLayout>
  )
}
