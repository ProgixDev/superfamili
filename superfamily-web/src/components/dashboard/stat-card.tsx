import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: LucideIcon
  value: string
  label: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  iconBgClass?: string
}

export function StatCard({
  icon: Icon,
  value,
  label,
  change,
  changeType = "positive",
  iconBgClass = "bg-[#E8F5EE]",
}: StatCardProps) {
  return (
    <Card className="border-[#E8E4DF] bg-white">
      <CardContent className="flex items-start gap-4 pt-2">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconBgClass
          )}
        >
          <Icon className="h-5 w-5 text-[#2E7D52]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {value}
          </p>
          <p className="text-sm text-[#8C8279]">{label}</p>
          {change && (
            <p
              className={cn("mt-1 text-xs font-medium", {
                "text-[#2E7D52]": changeType === "positive",
                "text-red-500": changeType === "negative",
                "text-[#8C8279]": changeType === "neutral",
              })}
            >
              {change}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
