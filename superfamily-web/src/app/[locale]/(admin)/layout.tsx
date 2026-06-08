"use client"

import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  CreditCard,
  AlertTriangle,
  Settings,
  GraduationCap,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations("dashboardNav")

  const navItems = [
    { href: "/admin", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/utilisateurs", label: t("users"), icon: Users },
    { href: "/admin/educators", label: t("educators"), icon: GraduationCap },
    { href: "/admin/verifications", label: t("verifications"), icon: ShieldCheck },
    { href: "/admin/documents", label: t("documents"), icon: FileText },
    { href: "/admin/educators/licenses", label: t("licenses"), icon: ShieldCheck },
    { href: "/admin/transactions", label: t("transactions"), icon: CreditCard },
    { href: "/admin/litiges", label: t("disputes"), icon: AlertTriangle },
    { href: "/admin/parametres", label: t("settings"), icon: Settings },
  ]

  return (
    <DashboardLayout
      navItems={navItems}
      notificationsHref="/admin"
    >
      {children}
    </DashboardLayout>
  )
}
