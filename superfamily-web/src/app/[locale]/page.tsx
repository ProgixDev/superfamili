import { redirect } from "next/navigation";
import { HeroSection } from "@/components/home/hero-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { FeaturesSection } from "@/components/home/features-section";
import { EducatorShowcase } from "@/components/home/educator-showcase";
import { CtaSection } from "@/components/home/cta-section";
import { createClient } from "@/lib/supabase/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function dashboardPathFor(role: string | undefined, locale: string): string | null {
  // The API stores roles in English ('parent' | 'educator' | 'admin'); only
  // the URL paths are French. Comparing against 'educateur' here previously
  // dropped every educator silently to the public homepage.
  if (role === "educator") return `/${locale}/educateur/tableau-de-bord`;
  if (role === "admin") return `/${locale}/admin`;
  if (role === "parent") return `/${locale}/parent/tableau-de-bord`;
  return null;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // If the user is already authenticated, send them straight to their dashboard
  // instead of showing the marketing landing page. We compute the destination
  // inside a try/catch (so a network/profile failure falls back to the public
  // homepage) and then call redirect() outside of it -- redirect() throws a
  // control-flow error that must propagate, not be swallowed.
  let redirectTo: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const profileRes = await fetch(`${API_URL}/profiles/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        // Skip caching so we always get the fresh role for redirect.
        cache: "no-store",
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        const role: string | undefined = profile?.data?.role ?? profile?.role;
        redirectTo = dashboardPathFor(role, locale);
      }
    }
  } catch {
    // Swallow auth/profile errors and fall through to render the public
    // homepage rather than blocking the visitor.
    redirectTo = null;
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return (
    <main>
      <HeroSection />
      <HowItWorks />
      <FeaturesSection />
      <EducatorShowcase />
      <CtaSection />
    </main>
  );
}
