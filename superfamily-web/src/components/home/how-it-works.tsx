"use client";

import { useTranslations } from "next-intl";
import { Search, MessageCircle, CreditCard, Shield, Star } from "lucide-react";

const searchResults = [
  {
    initials: "SM",
    name: "Sophie Marchand",
    info: "4.9 - 3.2km - Disponible",
    match: "98% match",
    matchColor: "bg-accent",
    price: "18$/h",
    bgColor: "bg-[#E8F5EE]",
  },
  {
    initials: "ML",
    name: "Marc Lavoie",
    info: "4.7 - 1.8km - Demain",
    match: "91% match",
    matchColor: "bg-gold",
    price: "22$/h",
    bgColor: "bg-[#E0F4F2]",
  },
  {
    initials: "LP",
    name: "Léa Paradis",
    info: "5.0 - 4.1km - Ce soir",
    match: "87% match",
    matchColor: "bg-accent",
    price: "25$/h",
    bgColor: "bg-[#EAF5EB]",
  },
];

export function HowItWorks() {
  const t = useTranslations("howItWorks");

  const steps = [
    {
      icon: Search,
      title: t("step1Title"),
      description: t("step1Desc"),
    },
    {
      icon: MessageCircle,
      title: t("step2Title"),
      description: t("step2Desc"),
    },
    {
      icon: CreditCard,
      title: t("step3Title"),
      description: t("step3Desc"),
    },
    {
      icon: Shield,
      title: t("step4Title"),
      description: t("step4Desc"),
    },
  ];

  return (
    <div
      id="comment-ca-marche"
      className="bg-white rounded-[40px] mx-3 md:mx-6 py-16 md:py-24 px-6 md:px-20"
    >
      <div className="max-w-[1100px] mx-auto">
        {/* Section header */}
        <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">
          {t("sectionLabel")}
        </p>
        <h2 className="font-heading text-3xl md:text-[44px] font-bold leading-[1.2] tracking-tight text-charcoal mb-5">
          {t("heading")}
        </h2>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mt-12 md:mt-16">
          {/* Steps */}
          <div className="flex flex-col">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className={`group flex gap-6 py-7 ${
                    index < steps.length - 1
                      ? "border-b border-light-border"
                      : ""
                  }`}
                >
                  <div className="w-12 h-12 shrink-0 rounded-[14px] bg-cream flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300 group-hover:scale-105">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base mb-2">
                      {step.title}
                    </h4>
                    <p className="text-sm text-warm-gray leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phone mockup */}
          <div className="bg-gradient-to-br from-cream to-[#C8E6D8] rounded-[32px] p-6 md:p-10 relative overflow-hidden">
            <div className="relative z-10">
              <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_40px_rgba(28,43,32,0.12)]">
                {/* Phone header */}
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-light-border">
                  <Search className="size-6 text-primary" />
                  <div>
                    <div className="font-semibold text-[15px]">
                      {t("bestMatches")}
                    </div>
                    <div className="text-xs text-warm-gray">
                      {t("educatorsFoundNearYou")}
                    </div>
                  </div>
                </div>

                {/* Results */}
                {searchResults.map((result, index) => (
                  <div
                    key={result.name}
                    className={`flex items-center gap-3.5 py-3.5 ${
                      index < searchResults.length - 1
                        ? "border-b border-cream"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-full ${result.bgColor} flex items-center justify-center shrink-0`}
                    >
                      <span className="text-xs font-bold text-primary">
                        {result.initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {result.name}
                      </div>
                      <div className="text-xs text-warm-gray mt-0.5 flex items-center gap-1">
                        <Star className="size-3 fill-gold text-gold" />
                        {result.info}
                      </div>
                      <span
                        className={`inline-block ${result.matchColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1`}
                      >
                        {result.match}
                      </span>
                    </div>
                    <div className="font-bold text-primary text-[15px]">
                      {result.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
