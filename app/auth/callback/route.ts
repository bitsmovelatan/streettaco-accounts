import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { DEFAULT_RETURN_URL, isProduction } from "@/lib/constants"

/** Cookie options for .streettaco.com.au so session is available on plus and other subdomains. */
const COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/" as const,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
}

/**
 * Build redirect URL with no error/code/state params so plus never sees auth artifacts.
 * Prefer return_to, then next; default to plus.
 */
function getCleanRedirectUrl(returnTo: string | null, next: string | null): string {
  const raw = returnTo ?? next ?? DEFAULT_RETURN_URL
  try {
    const u = new URL(raw)
    return u.origin + (u.pathname || "/")
  } catch {
    return DEFAULT_RETURN_URL
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
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

  const cookieOptions = isProduction() ? COOKIE_OPTIONS : undefined

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
      ...(cookieOptions && { cookieOptions }),
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