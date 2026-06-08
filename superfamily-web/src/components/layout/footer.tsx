"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

export function Footer() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");

  const platformLinks = [
    { href: "/recherche", label: t("findEducator") },
    { href: "/#comment-ca-marche", label: t("howItWorks") },
    { href: "/securite", label: t("security") },
    { href: "/paiements", label: t("payments") },
  ];

  const educatorLinks = [
    { href: "/devenir-educateur", label: t("becomeEducator") },
    { href: "/tarifs", label: t("pricing") },
    { href: "/ressources", label: t("resources") },
    { href: "/certifications", label: t("certifications") },
  ];

  const supportLinks = [
    { href: "/a-propos", label: t("about") },
    { href: "/blog", label: t("blog") },
    { href: "/presse", label: t("press") },
    { href: "/contact", label: t("contactUs") },
  ];

  return (
    <footer className="bg-charcoal text-white mt-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-10">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-16">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4">
              <img src="/images/logo.png" alt="SuperFamili" className="h-10 brightness-0 invert" />
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-[260px] mb-6">
              {t("tagline")}
            </p>
          </div>

          {/* Plateforme */}
          <div>
            <h5 className="font-bold text-sm text-white/90 mb-5">{t("platform")}</h5>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Educateurs */}
          <div>
            <h5 className="font-bold text-sm text-white/90 mb-5">{t("educators")}</h5>
            <ul className="space-y-3">
              {educatorLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h5 className="font-bold text-sm text-white/90 mb-5">{t("support")}</h5>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Assistance */}
          <div className="sm:col-span-2 lg:col-span-4 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 rounded-2xl bg-white/5 border border-white/10 px-6 py-4">
              <div className="flex items-center gap-2 text-white/70">
                <Phone className="size-4" />
                <span className="text-sm">{t("needHelp")}</span>
              </div>
              <a
                href="tel:+18005555555"
                className="text-lg font-bold text-white hover:text-[#80CBC4] transition-colors"
              >
                1-800-555-5555
              </a>
              <span className="text-xs text-white/40">{t("monFri")}</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10 text-[13px] text-white/40">
          <span>{tc("allRightsReserved")}</span>
          <div className="flex items-center gap-6">
            <Link href="/confidentialite" className="hover:text-white transition-colors">
              {t("privacy")}
            </Link>
            <Link href="/conditions" className="hover:text-white transition-colors">
              {t("terms")}
            </Link>
            <Link href="/cookies" className="hover:text-white transition-colors">
              {t("cookies")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
