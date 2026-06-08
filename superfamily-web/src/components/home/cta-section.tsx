"use client";

import { MapPin, Target, CalendarDays, Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function CtaSection() {
  const t = useTranslations("ctaSearch");

  const filterChips = [
    { label: t("filterAll"), active: true },
    { label: t("filterInfants"), active: false },
    { label: t("filter0to3"), active: false },
    { label: t("filter3to6"), active: false },
    { label: t("filter6to12"), active: false },
    { label: t("filterSpecialNeeds"), active: false },
    { label: t("filterNightCare"), active: false },
    { label: t("filterHomework"), active: false },
  ];

  return (
    <div className="mx-3 md:mx-6 mb-16">
      <div className="relative bg-charcoal rounded-[40px] px-6 md:px-20 py-16 md:py-20 overflow-hidden">
        {/* Decorative gradient circle */}
        <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(46,125,82,0.2)_0%,transparent_70%)] rounded-full" />

        {/* Content */}
        <div className="relative z-10">
          <p className="text-xs font-bold tracking-[2px] uppercase text-primary-light mb-4">
            {t("sectionLabel")}
          </p>
          <h2 className="font-heading text-3xl md:text-[44px] font-bold leading-[1.2] tracking-tight text-white mb-4">
            {t("headingLine1")}
            <br />
            {t("headingLine2")}
          </h2>
          <p className="text-base text-white/60 leading-relaxed max-w-[520px]">
            {t("description")}
          </p>

          {/* Search bar */}
          <div className="flex flex-col md:flex-row gap-3 mt-10 bg-white/8 border border-white/15 rounded-[20px] p-3">
            {/* Location */}
            <div className="flex-1 flex items-center gap-3 px-5">
              <MapPin className="size-[18px] text-white/60 shrink-0" />
              <input
                type="text"
                placeholder={t("locationPlaceholder")}
                className="bg-transparent border-none outline-none text-[15px] text-white placeholder:text-white/40 w-full py-2.5"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-white/10 self-stretch" />

            {/* Type */}
            <div className="flex-1 flex items-center gap-3 px-5">
              <Target className="size-[18px] text-white/60 shrink-0" />
              <input
                type="text"
                placeholder={t("servicePlaceholder")}
                className="bg-transparent border-none outline-none text-[15px] text-white placeholder:text-white/40 w-full py-2.5"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-white/10 self-stretch" />

            {/* Date */}
            <div className="flex-1 flex items-center gap-3 px-5">
              <CalendarDays className="size-[18px] text-white/60 shrink-0" />
              <input
                type="text"
                placeholder={t("datePlaceholder")}
                className="bg-transparent border-none outline-none text-[15px] text-white placeholder:text-white/40 w-full py-2.5"
              />
            </div>

            {/* Search button */}
            <button className="bg-primary text-white px-8 py-3.5 rounded-xl text-[15px] font-semibold whitespace-nowrap hover:bg-primary-light hover:scale-[1.02] transition-all duration-200 flex items-center gap-2">
              <Search className="size-4" />
              {t("searchButton")}
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            {filterChips.map((chip) => (
              <button
                key={chip.label}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  chip.active
                    ? "bg-primary border-primary text-white"
                    : "bg-white/10 border border-white/15 text-white/80 hover:bg-primary hover:border-primary hover:text-white"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
