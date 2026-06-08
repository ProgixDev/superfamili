"use client";

import Link from "next/link";
import { Star, ShieldCheck, CircleDot } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";

const miniCards = [
  {
    initials: "SM",
    name: "Sophie M.",
    role: "Éducatrice certifiée",
    rating: 5,
    tag: "Petite enfance",
    price: "18$/h",
    bgColor: "bg-[#E8F5EE]",
    textColor: "text-primary",
  },
  {
    initials: "ML",
    name: "Marc L.",
    role: "Éducateur sportif",
    rating: 4,
    tag: "Activités créatives",
    price: "22$/h",
    bgColor: "bg-[#E0F4F2]",
    textColor: "text-accent",
  },
  {
    initials: "LP",
    name: "Lea P.",
    role: "Garde d'enfants",
    rating: 5,
    tag: "Besoins spéciaux",
    price: "25$/h",
    bgColor: "bg-[#EAF5EB]",
    textColor: "text-primary",
  },
  {
    initials: "AK",
    name: "Amina K.",
    role: "Puéricultrice",
    rating: 5,
    tag: "Nourrissons",
    price: "30$/h",
    bgColor: "bg-[#E8F5EE]",
    textColor: "text-primary-dark",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3 ${
            i < count ? "fill-gold text-gold" : "fill-none text-light-border"
          }`}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  const t = useTranslations("hero");
  const { authenticated, role, loading } = useAuth();

  // Determine dashboard link.
  // Role values from the API are English (parent | educator | admin); only
  // the URL slugs are French.
  let dashboardHref = "/parent/tableau-de-bord";
  if (role === "educator") dashboardHref = "/educateur/tableau-de-bord";
  else if (role === "admin") dashboardHref = "/admin";

  return (
    <section className="relative min-h-[calc(100vh-76px)] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-warm-white via-[#EDF7F1] to-[#C8E6D8]" />

      {/* Decorative shapes */}
      <div className="absolute -right-[100px] -top-[50px] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(46,125,82,0.08)_0%,transparent_70%)] rounded-full animate-pulse-glow" />
      <div className="absolute -left-[80px] -bottom-[100px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(38,166,154,0.1)_0%,transparent_70%)] rounded-full animate-pulse-glow-reverse" />

      {/* Content grid */}
      <div className="relative max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left side */}
        <div>
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 bg-white border border-light-border px-4 py-2 rounded-full text-xs font-semibold text-accent uppercase tracking-wider mb-7">
            <CircleDot className="size-3 text-accent fill-accent" />
            {t("badge")}
          </div>

          {/* Heading */}
          <h1 className="animate-fade-in-up-delay-1 font-heading text-4xl sm:text-5xl lg:text-[62px] font-bold leading-[1.1] text-charcoal tracking-tight mb-6">
            {t("heading")}{" "}
            <em className="text-primary italic">{t("headingHighlight")}</em>
          </h1>

          {/* Description */}
          <p className="animate-fade-in-up-delay-2 text-[17px] leading-relaxed text-warm-gray max-w-[440px] mb-10">
            {t("description")}
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-in-up-delay-3 flex flex-wrap gap-4 items-center">
            {!loading && authenticated ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center px-9 py-4 text-[15px] font-semibold text-white bg-primary rounded-full hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(46,125,82,0.3)] transition-all duration-200"
              >
                {t("goToDashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/recherche"
                  className="inline-flex items-center px-9 py-4 text-[15px] font-semibold text-white bg-primary rounded-full hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(46,125,82,0.3)] transition-all duration-200"
                >
                  {t("findEducator")}
                </Link>
                <Link
                  href="/devenir-educateur"
                  className="inline-flex items-center px-9 py-4 text-[15px] font-semibold text-charcoal bg-white border-[1.5px] border-light-border rounded-full hover:border-primary hover:text-primary hover:-translate-y-0.5 transition-all duration-200"
                >
                  {t("iAmEducator")}
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="animate-fade-in-up-delay-4 flex gap-8 mt-12">
            <div className="border-l-2 border-light-border pl-5">
              <div className="font-heading text-[32px] font-bold text-charcoal">
                850+
              </div>
              <div className="text-[13px] text-warm-gray mt-0.5">
                {t("verifiedEducators")}
              </div>
            </div>
            <div className="border-l-2 border-light-border pl-5">
              <div className="font-heading text-[32px] font-bold text-charcoal flex items-center gap-1">
                4.9
                <Star className="size-5 fill-gold text-gold" />
              </div>
              <div className="text-[13px] text-warm-gray mt-0.5">
                {t("averageRating")}
              </div>
            </div>
            <div className="border-l-2 border-light-border pl-5">
              <div className="font-heading text-[32px] font-bold text-charcoal">
                12k+
              </div>
              <div className="text-[13px] text-warm-gray mt-0.5">
                {t("familiesHelped")}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - card grid */}
        <div className="hidden lg:block animate-fade-in-right relative">
          {/* Floating badge - top right */}
          <div className="absolute -top-5 -right-8 z-10 bg-white rounded-2xl px-[18px] py-3 shadow-[0_8px_40px_rgba(28,43,32,0.12)] flex items-center gap-2.5 text-[13px] font-medium animate-float-delay">
            <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
            <span>{t("availableNow")}</span>
          </div>

          {/* 2x2 card grid */}
          <div className="grid grid-cols-2 gap-4 relative">
            {miniCards.map((card, index) => (
              <div
                key={card.name}
                className={`bg-white rounded-[20px] p-5 shadow-[0_8px_40px_rgba(28,43,32,0.12)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer ${
                  index === 1 ? "mt-8" : ""
                } ${index === 3 ? "-mt-8" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-[52px] h-[52px] rounded-full ${card.bgColor} flex items-center justify-center mb-3`}
                >
                  <span className={`text-sm font-bold ${card.textColor}`}>
                    {card.initials}
                  </span>
                </div>
                <div className="font-semibold text-[15px] mb-1">{card.name}</div>
                <div className="text-xs text-warm-gray mb-2.5">{card.role}</div>
                <div className="mb-2">
                  <StarRating count={card.rating} />
                </div>
                <span className="inline-block bg-cream text-warm-gray text-[11px] font-medium px-2.5 py-1 rounded-full">
                  {card.tag}
                </span>
                <div className="font-bold text-base text-primary mt-2">
                  {card.price}
                </div>
              </div>
            ))}
          </div>

          {/* Floating badge - bottom left */}
          <div className="absolute -bottom-5 -left-8 z-10 bg-white rounded-2xl px-[18px] py-3 shadow-[0_8px_40px_rgba(28,43,32,0.12)] flex items-center gap-2.5 text-[13px] font-medium animate-float">
            <ShieldCheck className="size-4 text-primary" />
            <span>{t("securePayment")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
