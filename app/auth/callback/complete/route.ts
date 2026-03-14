import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import { trustedReturnUrlSchema } from "@/lib/validations"

function getCleanRedirectUrl(returnTo: string | null, next: string | null): string {
  const raw = returnTo ?? next ?? DEFAULT_RETURN_URL
  const parsed = trustedReturnUrlSchema.safeParse(raw)
  if (!parsed.success) return DEFAULT_RETURN_URL
  try {
    const u = new URL(parsed.data)
    return u.origin + (u.pathname || "/")
  } catch {
    return DEFAULT_RETURN_URL
  }
}

/**
 * GET /auth/callback/complete?expected_match=...&return_to=...&next=...
 * Called after the client has set the session from the hash (setSession).
 * Updates auth_sync so the waiting page (e.g. on another device) can see verification, then redirects.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const expectedMatchParam = requestUrl.searchParams.get("expected_match")
  const returnTo = requestUrl.searchParams.get("return_to")
  const next = requestUrl.searchParams.get("next")

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const loginUrl = new URL("/login", requestUrl.origin)
    loginUrl.searchParams.set("error", "no_session")
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    if (next) loginUrl.searchParams.set("next", next)
    return NextResponse.redirect(loginUrl)
  }

  if (expectedMatchParam !== null && expectedMatchParam !== "") {
    const expectedMatch = parseInt(expectedMatchParam, 10)
    if (!Number.isNaN(expectedMatch) && expectedMatch >= 10 && expectedMatch <= 99) {
      const email = session.user?.email
      if (email) {
        const tokenPayload = JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? null,
        })
        await supabase
          .from("auth_sync")
          .update({ status: "verified", token: tokenPayload })
          .eq("email", email.toLowerCase())
          .eq("match_number", expectedMatch)
          .eq("status", "pending")
      }
    }
  }

  const cleanUrl = getCleanRedirectUrl(returnTo, next)
  return NextResponse.redirect(cleanUrl)
}
