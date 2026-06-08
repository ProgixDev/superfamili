import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  // 1. First, handle internationalization (locale prefix)
  const response = intlMiddleware(request)

  // 2. Auth & RBAC Check
  // We need to check if the user has access to the requested route
  const pathname = request.nextUrl.pathname
  
  // Skip auth check for public routes and auth routes
  const isPublicRoute = 
    pathname === "/" || 
    pathname.match(/^\/[a-z]{2}\/?$/) || // Homepage with locale
    pathname.includes("/connexion") ||
    pathname.includes("/inscription") ||
    pathname.includes("/recherche") ||
    pathname.includes("/devenir-educateur") ||
    pathname.includes("/conditions") ||
    pathname.includes("/confidentialite") ||
    pathname.includes("/cookies") ||
    pathname.includes("/api/") ||
    pathname.includes("/images/") ||
    pathname.includes("/favicon.ico")

  if (isPublicRoute) {
    return response
  }

  // Determine which role is required for this route.
  // Role values are English in the API; URL paths are French.
  let requiredRole: "parent" | "educator" | "admin" | null = null
  if (pathname.includes("/parent/")) requiredRole = "parent"
  else if (pathname.includes("/educateur/")) requiredRole = "educator"
  else if (pathname.includes("/admin")) requiredRole = "admin"

  if (!requiredRole) {
    return response
  }

  // Initialize Supabase client to check session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          // Note: In middleware, we can't set cookies on the response
          // that comes from another middleware (intl) easily without
          // manual header merging, but for session check it's fine.
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login if no session
    const locale = pathname.split("/")[1] || "fr"
    const loginUrl = new URL(`/${locale}/connexion`, request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch profile to check role
  // We use the REST API here because it's faster and bypasses some RLS issues in middleware
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  const { data: { session } } = await supabase.auth.getSession()
  
  try {
    const profileRes = await fetch(`${API_URL}/profiles/me`, {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    })
    
    if (!profileRes.ok) {
      throw new Error("Failed to fetch profile")
    }
    
    const profile = await profileRes.json()
    const userRole = profile?.data?.role || profile?.role

    if (userRole !== requiredRole) {
      // User is logged in but has the wrong role for this section
      // Redirect to their respective dashboard
      const locale = pathname.split("/")[1] || "fr"
      let redirectPath = `/${locale}/parent/tableau-de-bord`
      if (userRole === "educator") redirectPath = `/${locale}/educateur/tableau-de-bord`
      else if (userRole === "admin") redirectPath = `/${locale}/admin`
      
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  } catch (error) {
    // If profile fetch fails, fallback to login for safety
    const locale = pathname.split("/")[1] || "fr"
    return NextResponse.redirect(new URL(`/${locale}/connexion`, request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
