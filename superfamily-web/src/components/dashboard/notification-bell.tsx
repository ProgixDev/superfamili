"use client"

import { Bell } from "lucide-react"
import Link from "next/link"

interface NotificationBellProps {
  unreadCount?: number
  href?: string
}

export function NotificationBell({
  unreadCount = 0,
  href = "/notifications",
}: NotificationBellProps) {
  return (
    <Link
      href={href}
      className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-[#E8E4DF]/50 transition-colors"
    >
      <Bell className="h-5 w-5 text-[#8C8279]" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C45B3E] px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}
