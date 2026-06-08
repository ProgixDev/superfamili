"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const labels: Record<string, string> = {
  fr: "FR",
  en: "EN",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-cream border border-light-border p-0.5 text-xs">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
            locale === loc
              ? "bg-primary text-white"
              : "text-warm-gray hover:text-charcoal"
          }`}
        >
          {labels[loc]}
        </button>
      ))}
    </div>
  );
}
