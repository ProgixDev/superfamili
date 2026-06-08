"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Globe, Check, PlayCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUpdateOnboarding } from "@/hooks/use-onboarding"

const languageLabels: Record<string, { name: string; flag: string }> = {
  fr: { name: "Français", flag: "🇫🇷" },
  en: { name: "English", flag: "🇬🇧" },
}

export function SettingsPage() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("settings")
  const tOnboarding = useTranslations("onboarding.settings")

  const updateOnboarding = useUpdateOnboarding()

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale })
  }

  /**
   * Resets the onboarding tour state so the tour re-runs on the next
   * page load. PATCHes `completed_steps=[], skipped=false, completed=false`
   * — which clears the three flags the `OnboardingTour` component
   * reads to decide whether to start.
   */
  function replayTutorial() {
    updateOnboarding.mutate(
      {
        completed_steps: [],
        skipped: false,
        completed: false,
      },
      {
        onSuccess: () => {
          toast.success(tOnboarding("replayToast"))
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          {t("title")}
        </h1>
        <p className="text-sm text-[#8C8279]">
          {t("subtitle")}
        </p>
      </div>

      {/* Language */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <Globe className="h-5 w-5 text-[#2E7D52]" />
            {t("language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[#8C8279]">
            {t("languageDescription")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {routing.locales.map((loc) => {
              const isActive = locale === loc
              const { name, flag } = languageLabels[loc]
              return (
                <button
                  key={loc}
                  onClick={() => switchLocale(loc)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    isActive
                      ? "border-[#2E7D52] bg-[#E8F5EE]"
                      : "border-[#E8E4DF] bg-white hover:border-[#2E7D52]/50 hover:bg-[#FAF8F5]"
                  }`}
                >
                  <span className="text-2xl">{flag}</span>
                  <div className="flex-1">
                    <p className={`font-semibold ${isActive ? "text-[#2E7D52]" : "text-[#1A1A1A]"}`}>
                      {name}
                    </p>
                    <p className="text-xs text-[#8C8279] uppercase">{loc}</p>
                  </div>
                  {isActive && (
                    <Check className="h-5 w-5 text-[#2E7D52]" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Onboarding tutorial replay */}
      <Card className="border-[#E8E4DF] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <PlayCircle className="h-5 w-5 text-[#2E7D52]" />
            {tOnboarding("replayTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[#8C8279]">
            {tOnboarding("replayDescription")}
          </p>
          <Button
            variant="outline"
            onClick={replayTutorial}
            disabled={updateOnboarding.isPending}
            className="gap-2 border-[#E8E4DF]"
          >
            {updateOnboarding.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {tOnboarding("replayButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
