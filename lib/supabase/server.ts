import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SHARED_COOKIE_OPTIONS, isProduction } from "@/lib/constants"

/**
 * Server Supabase client. Uses cookieOptions so session cookies are set with
 * domain .streettaco.com.au in production (localhost otherwise) for IdP.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const cookieOptions = isProduction()
    ? {
        domain: SHARED_COOKIE_OPTIONS.domain,
        path: SHARED_COOKIE_OPTIONS.path,
        sameSite: SHARED_COOKIE_OPTIONS.sameSite as "lax" | "strict" | "none",
        secure: SHARED_COOKIE_OPTIONS.secure,
        httpOnly: SHARED_COOKIE_OPTIONS.httpOnly,
      }
    : undefined

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
            const forceOptions = isProduction()
              ? {
                  domain: ".streettaco.com.au" as const,
                  path: "/",
                  sameSite: "lax" as const,
                  secure: true,
                  httpOnly: true,
                }
              : undefined
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                ...(forceOptions && forceOptions),
              })
            })
          } catch {
            // setAll from Server Component - ignored when middleware refreshes sessions
          }
        },
      },
      ...(cookieOptions && { cookieOptions }),
    }
  )
}
