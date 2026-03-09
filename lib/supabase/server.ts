import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SHARED_COOKIE_OPTIONS, isProduction } from "@/lib/constants"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const merged = isProduction()
                ? { ...options, ...SHARED_COOKIE_OPTIONS }
                : options
              cookieStore.set(name, value, merged)
            })
          } catch {
            // setAll from Server Component - ignored when middleware refreshes sessions
          }
        },
      },
    }
  )
}
