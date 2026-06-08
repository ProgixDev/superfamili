import Link from "next/link"
import { Home } from "lucide-react"
import { routing } from "@/i18n/routing"

/**
 * Catch-all 404 for paths that don't even match the [locale] segment
 * (e.g. someone hits /random with no fr/en prefix). The locale-aware
 * variant in [locale]/not-found.tsx covers the common case; this one
 * is the very last resort and intentionally has no i18n dependency
 * (it can't, since we don't know the locale yet).
 */
export default function RootNotFound() {
  const homeHref = `/${routing.defaultLocale}`

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="font-heading text-[96px] font-bold leading-none text-[#2E7D52]">
          404
        </p>
        <h1 className="mt-3 font-heading text-2xl font-bold text-[#1A1A1A]">
          Page introuvable
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8C8279]">
          La page que vous cherchez n&apos;existe pas ou a été déplacée. /
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href={homeHref}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#2E7D52] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#256943]"
        >
          <Home className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
