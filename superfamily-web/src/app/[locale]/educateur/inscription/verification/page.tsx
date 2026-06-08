"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiGet } from "@/lib/api/client"
import { KycHandoff } from "@/components/kyc/kyc-handoff"

/**
 * Shape returned by `GET /profiles/me` on the backend (wrapped by
 * TransformInterceptor as `{ success, data }`).
 */
interface ProfileMeResponse {
  data?: {
    id: string
    role: string
    first_name?: string
    last_name?: string
  }
}

/**
 * KYC entry-point page for educators.
 *
 * This is a standalone post-signup step — the educator reaches it
 * from a dashboard badge (or directly by URL). It is NOT part of a
 * multi-step signup flow because no such flow exists in the repo yet.
 *
 * The page's responsibilities are minimal:
 *   1. Resolve the educator's `profile_id` via GET /profiles/me.
 *   2. Render `<KycHandoff>` with that id.
 *   3. On success → toast + return to dashboard.
 *   4. On error → toast + keep the page open so the user can retry.
 *
 * All actual state management (session creation, device detection,
 * WebSocket subscription, polling, success/failure rendering) lives
 * inside `KycHandoff` — this page is intentionally thin.
 */
export default function KycVerificationPage() {
  const t = useTranslations("kyc")
  const router = useRouter()

  const { data: profileRes, isLoading } = useQuery<ProfileMeResponse>({
    queryKey: ["profile-me"],
    queryFn: () => apiGet("/profiles/me"),
  })

  const profileId = profileRes?.data?.id

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2E7D52]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
      <KycHandoff
        profileId={profileId}
        onComplete={() => {
          toast.success(t("successTitle"))
          router.push("/educateur/tableau-de-bord")
        }}
        onError={(err) => {
          toast.error(err.message || t("createSessionError"))
        }}
      />
    </div>
  )
}
