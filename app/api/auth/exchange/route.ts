import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { AUTH_STORAGE_KEY, DEFAULT_RETURN_URL, isProduction } from "@/lib/constants"
import { trustedReturnUrlSchema } from "@/lib/validations"

const COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/" as const,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
}

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
 * GET /api/auth/exchange?code=...&expected_match=...&return_to=...&next=...
 * Exchanges the auth code for a session, sets cookies, updates auth_sync if expected_match is present, redirects.
 * Used when Supabase sends ?code= in the callback URL (PKCE flow); the callback page redirects here.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const expectedMatchParam = requestUrl.searchParams.get("expected_match")
  const returnTo = requestUrl.searchParams.get("return_to")
  const next = requestUrl.searchParams.get("next")

  if (!code) {
    const loginUrl = new URL("/login", requestUrl.origin)
    loginUrl.searchParams.set("error", "no_code")
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    if (next) loginUrl.searchParams.set("next", next)
    return NextResponse.redirect(loginUrl)
  }

  const cookieStore = await cookies()
  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesFromSupabase) {
          cookiesFromSupabase.forEach((c) => cookiesToSet.push(c))
        },
      },
      cookieOptions: {
        name: AUTH_STORAGE_KEY,
        path: "/",
        ...(isProduction() && COOKIE_OPTIONS),
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const loginUrl = new URL("/login", requestUrl.origin)
    loginUrl.searchParams.set("error", "auth_failed")
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    if (next) loginUrl.searchParams.set("next", next)
    return NextResponse.redirect(loginUrl)
  }

  if (!data.session) {
    const loginUrl = new URL("/login", requestUrl.origin)
    loginUrl.searchParams.set("error", "no_session")
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    if (next) loginUrl.searchParams.set("next", next)
    return NextResponse.redirect(loginUrl)
  }

  if (expectedMatchParam !== null && expectedMatchParam !== "") {
    const expectedMatch = parseInt(expectedMatchParam, 10)
    if (Number.isNaN(expectedMatch) || expectedMatch < 10 || expectedMatch > 99) {
      const loginUrl = new URL("/login", requestUrl.origin)
      loginUrl.searchParams.set("error", "invalid_match")
      if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
      if (next) loginUrl.searchParams.set("next", next)
      return NextResponse.redirect(loginUrl)
    }
    const email = data.session.user?.email
    if (!email) {
      const loginUrl = new URL("/login", requestUrl.origin)
      loginUrl.searchParams.set("error", "no_email")
      if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
      if (next) loginUrl.searchParams.set("next", next)
      return NextResponse.redirect(loginUrl)
    }
    const tokenPayload = JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token ?? null,
    })
    const { data: row, error: updateError } = await supabase
      .from("auth_sync")
      .update({ status: "verified", token: tokenPayload })
      .eq("email", email.toLowerCase())
      .eq("match_number", expectedMatch)
      .eq("status", "pending")
      .select("id")
      .maybeSingle()

    if (updateError || !row) {
      const loginUrl = new URL("/login", requestUrl.origin)
      loginUrl.searchParams.set("error", "number_mismatch")
      if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
      if (next) loginUrl.searchParams.set("next", next)
      return NextResponse.redirect(loginUrl)
    }
  }

  const cleanUrl = getCleanRedirectUrl(returnTo, next)
  const response = NextResponse.redirect(cleanUrl)

  if (isProduction()) {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        domain: COOKIE_OPTIONS.domain,
        path: COOKIE_OPTIONS.path,
        sameSite: COOKIE_OPTIONS.sameSite,
        secure: COOKIE_OPTIONS.secure,
        httpOnly: COOKIE_OPTIONS.httpOnly,
        maxAge: (options?.maxAge as number) ?? undefined,
      })
    })
  } else {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        path: (options?.path as string) ?? "/",
        maxAge: (options?.maxAge as number) ?? undefined,
        httpOnly: (options?.httpOnly as boolean) ?? true,
        secure: false,
        sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
      })
    })
  }

  return response
}
