import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  AUTH_STORAGE_KEY,
  DEFAULT_RETURN_URL,
  isProduction,
  SHARED_COOKIE_OPTIONS,
} from "@/lib/constants"
import { isTrustedReturnUrl } from "@/lib/validations"

/**
 * GET /auth/logout?return_to=...
 * Clears the session (cookie) so the user is signed out on all *.streettaco.com.au,
 * then redirects to return_to (e.g. Plus dashboard). Keeps the user on the caller app.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const returnToRaw = requestUrl.searchParams.get("return_to") ?? DEFAULT_RETURN_URL
  const redirectUrl = isTrustedReturnUrl(returnToRaw) ? returnToRaw : DEFAULT_RETURN_URL

  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "local" })

  const res = NextResponse.redirect(redirectUrl)

  // Clear the shared session cookie so Plus (and all subdomains) see the user as logged out
  res.cookies.set(AUTH_STORAGE_KEY, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    ...(isProduction() && {
      domain: SHARED_COOKIE_OPTIONS.domain,
    }),
  })

  return res
}
