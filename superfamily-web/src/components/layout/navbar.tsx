"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "./language-switcher";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  const { authenticated, role, loading } = useAuth();

  const navLinks = [
    { href: "/", label: tc("home") },
    { href: "/recherche", label: t("findEducator") },
  ];

  // Only show "Become Educator" if not already an educator.
  // (Role values come from the API in English: parent | educator | admin.
  // URL paths stay French.)
  if (role !== "educator") {
    navLinks.push({ href: "/devenir-educateur", label: t("becomeEducator") });
  }

  // Determine dashboard link
  let dashboardHref = "/parent/tableau-de-bord";
  if (role === "educator") dashboardHref = "/educateur/tableau-de-bord";
  else if (role === "admin") dashboardHref = "/admin";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 bg-cream/92 backdrop-blur-[20px] border-b border-light-border transition-all duration-300">
      {/* Logo */}
      <Link href="/">
        <img src="/images/logo.png" alt="SuperFamili" className="h-9" />
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-9">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-warm-gray tracking-wide hover:text-primary transition-colors duration-200"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Desktop action buttons */}
      <div className="hidden md:flex items-center gap-4">
        <LanguageSwitcher />
        {!loading && (
          <>
            {authenticated ? (
              <Link
                href={dashboardHref}
                className="text-sm font-semibold text-white bg-primary px-6 py-2.5 rounded-full hover:bg-primary-dark transition-all duration-200 hover:-translate-y-px"
              >
                {tc("dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/connexion"
                  className="text-sm font-medium text-charcoal px-5 py-2.5 rounded-full hover:bg-light-border transition-colors duration-200"
                >
                  {tc("login")}
                </Link>
                <Link
                  href="/inscription"
                  className="text-sm font-semibold text-white bg-primary px-6 py-2.5 rounded-full hover:bg-primary-dark transition-all duration-200 hover:-translate-y-px"
                >
                  {tc("signup")}
                </Link>
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="p-2 rounded-lg hover:bg-light-border transition-colors"
            aria-label={t("openMenu")}
          >
            <Menu className="size-6 text-charcoal" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] bg-cream p-0">
            <SheetHeader className="p-6 border-b border-light-border">
              <SheetTitle>
                <img src="/images/logo.png" alt="SuperFamili" className="h-8" />
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col p-6 gap-2">
              {navLinks.map((link) => (
                <SheetClose key={link.href} render={<div />}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block text-base font-medium text-charcoal py-3 px-4 rounded-xl hover:bg-light-border transition-colors"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </div>

            <div className="flex flex-col gap-3 p-6 mt-auto border-t border-light-border">
              <div className="flex justify-center mb-2">
                <LanguageSwitcher />
              </div>
              {!loading && (
                <>
                  {authenticated ? (
                    <Link
                      href={dashboardHref}
                      onClick={() => setOpen(false)}
                      className="text-center text-sm font-semibold text-white bg-primary py-3 px-6 rounded-full hover:bg-primary-dark transition-colors"
                    >
                      {tc("dashboard")}
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/connexion"
                        onClick={() => setOpen(false)}
                        className="text-center text-sm font-medium text-charcoal py-3 px-6 rounded-full border border-light-border hover:bg-light-border transition-colors"
                      >
                        {tc("login")}
                      </Link>
                      <Link
                        href="/inscription"
                        onClick={() => setOpen(false)}
                        className="text-center text-sm font-semibold text-white bg-primary py-3 px-6 rounded-full hover:bg-primary-dark transition-colors"
                      >
                        {tc("signup")}
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
