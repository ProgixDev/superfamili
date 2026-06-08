"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  Bell,
  Calendar,
  Star,
  CreditCard,
  MessageCircle,
  Shield,
  AlertTriangle,
  Check,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  notification_type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  related_booking_id: string | null
}

interface NotificationsResponse {
  data: Notification[]
  meta: Record<string, unknown>
}

const typeIcons: Record<string, LucideIcon> = {
  booking: Calendar,
  booking_confirmed: Calendar,
  booking_cancelled: Calendar,
  booking_reminder: Calendar,
  message: MessageCircle,
  new_message: MessageCircle,
  review: Star,
  review_received: Star,
  payment: CreditCard,
  payment_received: CreditCard,
  payment_processed: CreditCard,
  security: Shield,
  alert: AlertTriangle,
  system: Bell,
}

const typeBgColors: Record<string, string> = {
  booking: "bg-[#E8F5EE]",
  booking_confirmed: "bg-[#E8F5EE]",
  booking_cancelled: "bg-red-50",
  booking_reminder: "bg-[#E8F5EE]",
  message: "bg-[#E3F0FF]",
  new_message: "bg-[#E3F0FF]",
  review: "bg-[#FFF8E1]",
  review_received: "bg-[#FFF8E1]",
  payment: "bg-[#FFF3EE]",
  payment_received: "bg-[#FFF3EE]",
  payment_processed: "bg-[#FFF3EE]",
  security: "bg-[#F5F0FF]",
  alert: "bg-red-50",
  system: "bg-[#FAF8F5]",
}

const typeIconColors: Record<string, string> = {
  booking: "text-[#2E7D52]",
  booking_confirmed: "text-[#2E7D52]",
  booking_cancelled: "text-red-500",
  booking_reminder: "text-[#2E7D52]",
  message: "text-[#1976D2]",
  new_message: "text-[#1976D2]",
  review: "text-[#F9A825]",
  review_received: "text-[#F9A825]",
  payment: "text-[#C45B3E]",
  payment_received: "text-[#C45B3E]",
  payment_processed: "text-[#C45B3E]",
  security: "text-purple-500",
  alert: "text-red-500",
  system: "text-[#8C8279]",
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "maintenant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffDays === 1) return "hier"
  if (diffDays < 7) return `il y a ${diffDays}j`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`
  return date.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })
}

function getIconForType(notificationType: string): LucideIcon {
  return typeIcons[notificationType] ?? Bell
}

function getBgColorForType(notificationType: string): string {
  return typeBgColors[notificationType] ?? "bg-[#FAF8F5]"
}

function getIconColorForType(notificationType: string): string {
  return typeIconColors[notificationType] ?? "text-[#8C8279]"
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: notificationsResponse, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["parent-notifications"],
    queryFn: () => apiGet("/notifications"),
  })

  const notifications = notificationsResponse?.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-notifications"] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiPatch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-notifications"] })
    },
  })

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id)
    }
    if (notif.related_booking_id) {
      router.push(`/parent/reservations/${notif.related_booking_id}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Notifications
          </h1>
          <p className="text-sm text-[#8C8279]">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-[#E8E4DF] text-[#8C8279]"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
            <Bell className="h-8 w-8 text-[#8C8279]" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
            Aucune notification
          </h3>
          <p className="mt-1 text-sm text-[#8C8279]">
            Vous n&apos;avez aucune notification pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = getIconForType(notif.notification_type)
            return (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-xl border border-[#E8E4DF] p-4 text-left transition-colors hover:bg-[#FAF8F5]",
                  notif.is_read ? "bg-white" : "bg-[#E8F5EE]/40"
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    getBgColorForType(notif.notification_type)
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      getIconColorForType(notif.notification_type)
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm text-[#1A1A1A]",
                        notif.is_read ? "font-semibold" : "font-bold"
                      )}
                    >
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#2E7D52]" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[#8C8279]">{notif.message}</p>
                </div>
                <span className="shrink-0 text-xs text-[#8C8279]">
                  {formatRelativeTime(notif.created_at)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
