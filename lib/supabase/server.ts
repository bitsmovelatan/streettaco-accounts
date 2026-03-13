import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { AUTH_STORAGE_KEY, isProduction } from "@/lib/constants"

/**
 * Shared-domain options so all Supabase auth cookies are stored under the root
 * domain and plus.streettaco.com.au can read them. Only applied in production.
 */
const SHARED_DOMAIN_COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/" as const,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
}

/**
 * Server Supabase client. In production, setAll writes every auth cookie with
 * domain .streettaco.com.au, path /, so plus can read the session.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const useSharedDomain = isProduction()

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
              cookieStore.set(name, value, {
                ...options,
                ...(useSharedDomain && SHARED_DOMAIN_COOKIE_OPTIONS),
              })
            })
          } catch {
            // setAll from Server Component - ignored when middleware refreshes sessions
          }
        },
      },
      cookieOptions: {
        name: AUTH_STORAGE_KEY,
        path: "/",
        ...(useSharedDomain && SHARED_DOMAIN_COOKIE_OPTIONS),
      },
    }
  )
}
