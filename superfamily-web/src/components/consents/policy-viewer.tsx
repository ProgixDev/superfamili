"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  usePolicyContent,
  type ConsentType,
} from "@/hooks/use-consents"

export interface PolicyViewerProps {
  /** Which policy to render. `null` closes the modal. */
  consentType: ConsentType | null
  /**
   * Optional version override. If omitted, the modal fetches the
   * current (latest) version. Useful for the audit page where a user
   * wants to see the exact version they accepted historically.
   */
  version?: string
  /** Called when the user closes the modal. */
  onClose: () => void
}

/**
 * Read-only Markdown viewer for any policy version. Used as a building
 * block by every consent modal (signup, KYC, background check, etc.) to
 * show the full legal text in a nested dialog when the user clicks a
 * "Read full consent" link.
 *
 * The content is fetched from `GET /consents/policy` — the backend
 * returns the exact `content_md` column from `policy_versions`, so
 * historical versions are preserved and users can always see what they
 * actually agreed to.
 */
export function PolicyViewer({
  consentType,
  version,
  onClose,
}: PolicyViewerProps) {
  const t = useTranslations("consents.policyViewer")
  const tTypes = useTranslations("consents.types")

  const { data, isLoading, error } = usePolicyContent(consentType, version)

  const open = consentType !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {consentType ? tTypes(consentType) : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#2E7D52]" />
              <span className="ml-2 text-sm text-[#8C8279]">
                {t("loading")}
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {t("error")}
            </div>
          )}

          {data && (
            // Styled prose wrapper — leans on the Tailwind Typography
            // plugin conventions used elsewhere in the app (prose-green
            // in the /conditions and /confidentialite pages).
            <article className="prose prose-green max-w-none text-sm leading-relaxed text-[#1A1A1A] prose-headings:font-heading prose-headings:text-[#1A1A1A] prose-a:text-[#2E7D52]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {data.content_md}
              </ReactMarkdown>
            </article>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-[#2E7D52] text-white hover:bg-[#256943]"
          >
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
