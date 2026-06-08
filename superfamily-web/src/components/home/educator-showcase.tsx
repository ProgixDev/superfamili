"use client";

import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

const educators = [
  {
    initials: "SM",
    name: "Sophie Marchand",
    location: "Plateau-Mont-Royal - 3.2km",
    bioFr:
      "Éducatrice diplômée avec 8 ans d'expérience auprès des enfants de 0 à 6 ans. Certifiée en premiers secours.",
    bioEn:
      "Certified educator with 8 years of experience with children aged 0 to 6. First aid certified.",
    tagsFr: ["Petite enfance", "Bilingue", "Premiers secours"],
    tagsEn: ["Early childhood", "Bilingual", "First aid"],
    rating: 4.9,
    reviews: 142,
    stars: 5,
    price: "18$",
    gradient: "bg-gradient-to-br from-primary to-accent",
    avatarBg: "bg-[#E8F5EE]",
  },
  {
    initials: "ML",
    name: "Marc Lavoie",
    location: "Rosemont - 1.8km",
    bioFr:
      "Éducateur spécialisé en activités créatives et sportives. Passionné par le développement de l'enfant par le jeu.",
    bioEn:
      "Educator specializing in creative and sports activities. Passionate about child development through play.",
    tagsFr: ["Activités créatives", "Sport", "3-12 ans"],
    tagsEn: ["Creative activities", "Sports", "3-12 years"],
    rating: 4.7,
    reviews: 89,
    stars: 4,
    price: "22$",
    gradient: "bg-gradient-to-br from-accent to-[#B5D4B8]",
    avatarBg: "bg-[#E0F4F2]",
  },
  {
    initials: "AK",
    name: "Amina Kouyate",
    location: "Outremont - 4.1km",
    bioFr:
      "Puéricultrice de formation, spécialisée dans la garde de nourrissons et enfants avec besoins particuliers.",
    bioEn:
      "Pediatric nurse by training, specialized in infant care and children with special needs.",
    tagsFr: ["Nourrissons", "Besoins spéciaux", "Trilingue"],
    tagsEn: ["Infants", "Special needs", "Trilingual"],
    rating: 5.0,
    reviews: 203,
    stars: 5,
    price: "30$",
    gradient: "bg-gradient-to-br from-gold to-[#E8C87A]",
    avatarBg: "bg-[#EAF5EB]",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-[13px] ${
            i < count ? "fill-gold text-gold" : "fill-none text-light-border"
          }`}
        />
      ))}
    </div>
  );
}

export function EducatorShowcase() {
  const t = useTranslations("educatorShowcase");
  const locale = useLocale();
  const isEn = locale === "en";

  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-12">
        <div>
          <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">
            {t("sectionLabel")}
          </p>
          <h2 className="font-heading text-3xl md:text-[44px] font-bold leading-[1.2] tracking-tight text-charcoal">
            {t("heading")}
          </h2>
        </div>
        <Link
          href="/recherche"
          className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          {t("viewAll")}
        </Link>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {educators.map((educator) => {
          const bio = isEn ? educator.bioEn : educator.bioFr;
          const tags = isEn ? educator.tagsEn : educator.tagsFr;
          return (
            <div
              key={educator.name}
              className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(28,43,32,0.08)] hover:-translate-y-1.5 hover:shadow-[0_8px_40px_rgba(28,43,32,0.12)] transition-all duration-300 cursor-pointer"
            >
              {/* Gradient header */}
              <div className={`h-[120px] ${educator.gradient} relative overflow-hidden`}>
                <div
                  className={`absolute -bottom-6 left-6 w-[72px] h-[72px] rounded-full border-4 border-white ${educator.avatarBg} flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}
                >
                  <span className="text-lg font-bold text-primary">
                    {educator.initials}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="pt-9 px-6 pb-6">
                <div className="font-bold text-lg mb-0.5">{educator.name}</div>
                <div className="text-[13px] text-warm-gray mb-3 flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {educator.location}
                </div>
                <p className="text-sm text-warm-gray leading-relaxed mb-4">
                  {bio}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-cream text-warm-gray text-xs font-medium px-3 py-1.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-light-border">
                  <div className="flex items-center gap-1.5">
                    <StarRating count={educator.stars} />
                    <span className="text-[13px] text-warm-gray">
                      {educator.rating} ({t("reviewsLabel", { count: educator.reviews })})
                    </span>
                  </div>
                  <div className="font-bold text-base text-primary">
                    {educator.price}{" "}
                    <span className="font-normal text-[13px] text-warm-gray">
                      {t("perHour")}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <button className="w-full mt-4 bg-charcoal text-white py-3.5 rounded-[14px] text-sm font-semibold hover:bg-primary transition-colors duration-200">
                  {t("viewProfile")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
