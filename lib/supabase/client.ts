import { createBrowserClient } from "@supabase/ssr"
import { AUTH_STORAGE_KEY } from "@/lib/constants"

/**
 * Browser Supabase client. Uses a consistent storage key and cookie options
 * so the session is readable by all subdomains (e.g. plus.streettaco.com.au).
 *
 * Shared domain cookie fix (production): domain ".streettaco.com.au", path "/",
 * sameSite "lax", secure true. Required so that after setSession on the waiting
 * page and redirect to Plus, the cookie is sent to plus.streettaco.com.au.
 */
export function createClient() {
  const isProduction = process.env.NODE_ENV === "production"
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: AUTH_STORAGE_KEY,
        path: "/",
        ...(isProduction && {
          domain: ".streettaco.com.au",
          secure: true,
          sameSite: "lax",
        }),
      },
    }
  )
}
