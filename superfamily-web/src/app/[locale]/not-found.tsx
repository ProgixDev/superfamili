import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"
import { getTranslations } from "next-intl/server"

/**
 * Branded 404 surface for any path under `/[locale]/...` that doesn't
 * match a real page. Replaces Next.js's default black-on-white screen,
 * which looks like a server crash to non-technical users.
 *
 * Server component on purpose — no auth, no client state needed; we
 * just want a fast, friendly bounce-back.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound")

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#FAF8F5] px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Big 404 — heading-style for warmth, not an error code dump */}
        <p className="font-heading text-[96px] font-bold leading-none text-[#2E7D52]">
          404
        </p>
        <h1 className="mt-3 font-heading text-2xl font-bold text-[#1A1A1A]">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8C8279]">
          {t("body")}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2E7D52] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#256943]"
          >
            <Home className="h-4 w-4" />
            {t("homeAction")}
          </Link>
          {/* JS-free "back" affordance — server component, so we use a
              detail link to /recherche as a useful default rather than a
              client-only history.back(). */}
          <Link
            href="/recherche"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E8E4DF] bg-white px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#FAF8F5]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("searchAction")}
          </Link>
        </div>
      </div>
    </div>
  )
}
