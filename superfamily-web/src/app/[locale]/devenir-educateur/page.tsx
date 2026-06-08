"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  DollarSign,
  Calendar,
  ShieldCheck,
  Users,
  Clock,
  Star,
  MapPin,
  ArrowRight,
  CheckCircle,
} from "lucide-react"

export default function DevenirEducateurPage() {
  const t = useTranslations("becomeEducator")

  const benefits = [
    {
      icon: DollarSign,
      title: t("attractiveRevenue"),
      description: t("attractiveRevenueDesc"),
    },
    {
      icon: Calendar,
      title: t("flexibleSchedule"),
      description: t("flexibleScheduleDesc"),
    },
    {
      icon: ShieldCheck,
      title: t("verifiedProfile"),
      description: t("verifiedProfileDesc"),
    },
    {
      icon: Users,
      title: t("localClientele"),
      description: t("localClienteleDesc"),
    },
    {
      icon: Clock,
      title: t("simplifiedManagement"),
      description: t("simplifiedManagementDesc"),
    },
    {
      icon: Star,
      title: t("onlineReputation"),
      description: t("onlineReputationDesc"),
    },
  ]

  const steps = [
    {
      number: "1",
      title: t("step1"),
      description: t("step1Desc"),
    },
    {
      number: "2",
      title: t("step2"),
      description: t("step2Desc"),
    },
    {
      number: "3",
      title: t("step3"),
      description: t("step3Desc"),
    },
    {
      number: "4",
      title: t("step4"),
      description: t("step4Desc"),
    },
    {
      number: "5",
      title: t("step5"),
      description: t("step5Desc"),
    },
  ]

  const requirements = [
    t("requirement1"),
    t("requirement2"),
    t("requirement3"),
    t("requirement4"),
    t("requirement5"),
    t("requirement6"),
  ]

  return (
    <div className="bg-[#F4FAF6]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0FAF4] via-[#EDF7F1] to-[#C8E6D8]" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D8EAE0] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#26A69A]">
            <MapPin className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight text-[#1C2B20] md:text-6xl md:leading-tight">
            {t("heading")}{" "}
            <span className="italic text-[#2E7D52]">SuperFamili</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#607060]">
            {t("description")}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/inscription"
              className="inline-flex items-center gap-2 rounded-full bg-[#2E7D52] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#1B5E38] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(46,125,82,0.3)]"
            >
              {t("createAccount")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/recherche"
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#D8EAE0] bg-white px-8 py-4 text-[15px] font-semibold text-[#1C2B20] transition-all hover:border-[#2E7D52] hover:text-[#2E7D52] hover:-translate-y-0.5"
            >
              {t("viewEducators")}
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-4 text-xs font-bold uppercase tracking-[2px] text-[#2E7D52]">
          {t("advantages")}
        </div>
        <h2 className="font-heading text-3xl font-bold text-[#1C2B20] md:text-4xl">
          {t("whyBecomeEducator")}
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(28,43,32,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(28,43,32,0.12)]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4FAF6] transition-all group-hover:bg-[#2E7D52] group-hover:text-white">
                <b.icon className="h-6 w-6 text-[#2E7D52] group-hover:text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#1C2B20]">
                {b.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#607060]">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-6 rounded-[40px] bg-white py-20 md:mx-8">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-4 text-xs font-bold uppercase tracking-[2px] text-[#2E7D52]">
            {t("howItWorksLabel")}
          </div>
          <h2 className="font-heading text-3xl font-bold text-[#1C2B20] md:text-4xl">
            {t("stepsHeading")}
          </h2>
          <div className="mt-12 space-y-0">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-6 border-b border-[#D8EAE0] py-6 last:border-0"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2E7D52] text-sm font-bold text-white">
                  {step.number}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#1C2B20]">
                    {step.title}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-[#607060]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-2xl bg-[#1C2B20] p-8 text-center md:p-16">
          <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
            {t("howMuchCanYouEarn")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#A5D6A7]">
            {t("earningsDescription")}
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-6">
              <p className="font-heading text-3xl font-bold text-white">70%</p>
              <p className="mt-1 text-sm text-[#A5D6A7]">
                {t("perBooking")}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6">
              <p className="font-heading text-3xl font-bold text-white">
                22 $/h
              </p>
              <p className="mt-1 text-sm text-[#A5D6A7]">{t("averageRate")}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-6">
              <p className="font-heading text-3xl font-bold text-white">
                1 500 $+
              </p>
              <p className="mt-1 text-sm text-[#A5D6A7]">{t("perMonth")}</p>
            </div>
          </div>
          <Link
            href="/inscription"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#2E7D52] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#4CAF78] hover:-translate-y-0.5"
          >
            {t("startNow")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Checklist */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="font-heading text-2xl font-bold text-[#1C2B20]">
          {t("whatYouNeed")}
        </h2>
        <div className="mt-6 space-y-3">
          {requirements.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <CheckCircle className="h-5 w-5 shrink-0 text-[#2E7D52]" />
              <span className="text-sm text-[#1C2B20]">{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
