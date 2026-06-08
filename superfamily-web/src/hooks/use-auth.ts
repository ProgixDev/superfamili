import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api/client"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"

export interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  // API role values are English: parent | educator | admin.
  role: "parent" | "educator" | "admin"
  avatar_url: string | null
  // Add other fields as needed
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Initial user fetch
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const { data: profileData, isLoading: isProfileLoading, error: profileError } = useQuery({
    queryKey: ["profile-me"],
    queryFn: async () => {
      const { data } = await apiGet<{ data: Profile }>("/profiles/me")
      return data
    },
    enabled: !!user,
  })

  const profile = profileData || (profileData as any)?.data

  return {
    user,
    profile: profile as Profile | undefined,
    role: profile?.role as "parent" | "educator" | "admin" | undefined,
    loading: loading || isProfileLoading,
    authenticated: !!user,
    error: profileError,
  }
}
