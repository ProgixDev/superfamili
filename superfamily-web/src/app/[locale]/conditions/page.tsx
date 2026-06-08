"use client"

import { useTranslations } from "next-intl"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export default function ConditionsPage() {
  const t = useTranslations("legal.terms")
  const tc = useTranslations("common")

  const sections = [
    t("section1"),
    t("section2"),
    t("section3"),
    t("section4"),
    t("section5"),
    t("section6"),
    t("section7"),
    t("section8"),
    t("section9"),
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F4FAF6]">
        <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
          <h1 className="font-heading text-3xl font-bold text-[#1C2B20] md:text-4xl mb-4">
            {t("title")}
          </h1>
          <p className="text-sm text-[#607060] mb-12">
            {t("lastUpdated")}
          </p>

          <div className="prose prose-green max-w-none space-y-8 text-[#3A3A3A]">
            {sections.map((heading) => (
              <section key={heading}>
                <h2 className="font-heading text-xl font-bold text-[#1C2B20] mb-3">
                  {heading}
                </h2>
                <p className="leading-relaxed text-sm">{tc("comingSoon")}</p>
              </section>
            ))}

            <section>
              <h2 className="font-heading text-xl font-bold text-[#1C2B20] mb-3">
                {t("section10")}
              </h2>
              <p className="leading-relaxed text-sm">
                {t("contactText")}
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
