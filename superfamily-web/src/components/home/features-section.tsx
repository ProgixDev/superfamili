"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Users,
  MessageSquare,
  CalendarDays,
  CreditCard,
  Star,
  BarChart3,
  CalendarClock,
  Trophy,
  Briefcase,
  TrendingUp,
  Landmark,
} from "lucide-react";

export function FeaturesSection() {
  const t = useTranslations("features");
  const [activeTab, setActiveTab] = useState<"parents" | "educateurs">(
    "parents"
  );

  const parentFeatures = [
    {
      icon: Search,
      iconBg: "bg-[#E8F5EE]",
      title: t("smartSearch"),
      description: t("smartSearchDesc"),
    },
    {
      icon: Users,
      iconBg: "bg-[#E0F4F2]",
      title: t("smartMatching"),
      description: t("smartMatchingDesc"),
    },
    {
      icon: MessageSquare,
      iconBg: "bg-[#EAF5EB]",
      title: t("secureMessaging"),
      description: t("secureMessagingDesc"),
    },
    {
      icon: CalendarDays,
      iconBg: "bg-[#E8F5EE]",
      title: t("simplifiedBooking"),
      description: t("simplifiedBookingDesc"),
    },
    {
      icon: CreditCard,
      iconBg: "bg-[#E0F4F2]",
      title: t("securePayment"),
      description: t("securePaymentDesc"),
    },
    {
      icon: Star,
      iconBg: "bg-[#EAF5EB]",
      title: t("verifiedReviews"),
      description: t("verifiedReviewsDesc"),
    },
  ];

  const educatorFeatures = [
    {
      icon: BarChart3,
      iconBg: "bg-[#E8F5EE]",
      title: t("revenueDashboard"),
      description: t("revenueDashboardDesc"),
    },
    {
      icon: CalendarClock,
      iconBg: "bg-[#E0F4F2]",
      title: t("availabilityManagement"),
      description: t("availabilityManagementDesc"),
    },
    {
      icon: Trophy,
      iconBg: "bg-[#EAF5EB]",
      title: t("autoHighlight"),
      description: t("autoHighlightDesc"),
    },
    {
      icon: Briefcase,
      iconBg: "bg-[#E8F5EE]",
      title: t("professionalProfile"),
      description: t("professionalProfileDesc"),
    },
    {
      icon: TrendingUp,
      iconBg: "bg-[#E0F4F2]",
      title: t("detailedStats"),
      description: t("detailedStatsDesc"),
    },
    {
      icon: Landmark,
      iconBg: "bg-[#EAF5EB]",
      title: t("bankManagement"),
      description: t("bankManagementDesc"),
    },
  ];

  const features =
    activeTab === "parents" ? parentFeatures : educatorFeatures;

  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24">
      {/* Header */}
      <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">
        {t("sectionLabel")}
      </p>
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12 md:mb-16">
        <h2 className="font-heading text-3xl md:text-[44px] font-bold leading-[1.2] tracking-tight text-charcoal">
          {t("heading")}
        </h2>

        {/* Tab switcher */}
        <div className="flex bg-cream rounded-full p-1 w-fit">
          <button
            onClick={() => setActiveTab("parents")}
            className={`px-7 py-3 rounded-full text-sm font-medium transition-all duration-250 ${
              activeTab === "parents"
                ? "bg-primary text-white font-semibold"
                : "text-warm-gray hover:text-charcoal"
            }`}
          >
            {t("forParents")}
          </button>
          <button
            onClick={() => setActiveTab("educateurs")}
            className={`px-7 py-3 rounded-full text-sm font-medium transition-all duration-250 ${
              activeTab === "educateurs"
                ? "bg-primary text-white font-semibold"
                : "text-warm-gray hover:text-charcoal"
            }`}
          >
            {t("forEducators")}
          </button>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-white rounded-[20px] p-7 shadow-[0_4px_24px_rgba(28,43,32,0.08)] hover:-translate-y-1 transition-transform duration-300"
            >
              <div
                className={`w-[52px] h-[52px] rounded-2xl ${feature.iconBg} flex items-center justify-center mb-5`}
              >
                <Icon className="size-6 text-primary" />
              </div>
              <h4 className="font-bold text-base mb-2.5">{feature.title}</h4>
              <p className="text-sm text-warm-gray leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
