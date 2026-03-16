import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { AUTH_STORAGE_KEY, DEFAULT_RETURN_URL, isProduction } from "@/lib/constants"
import { isTrustedReturnUrl } from "@/lib/validations"

const COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/" as const,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
}

/**
 * POST /api/auth/apply-and-redirect
 * Body: JSON { token, return_to } or form-urlencoded token & return_to.
 * Token is the JSON string from auth_sync: { access_token, refresh_token }.
 * Sets the session cookie on the server (with domain .streettaco.com.au) so Plus receives it,
 * then redirects to return_to. Use this from the waiting page so the cookie is set before Plus.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  let tokenRaw: string | undefined
  let returnToRaw: string | undefined
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json() as { token?: string; return_to?: string }
      tokenRaw = body.token
      returnToRaw = body.return_to
    } catch {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  } else {
    const formData = await request.formData()
    tokenRaw = formData.get("token") as string | null
    returnToRaw = (formData.get("return_to") as string | null) ?? undefined
  }
  returnToRaw = returnToRaw ?? DEFAULT_RETURN_URL
  const redirectUrl = isTrustedReturnUrl(returnToRaw) ? returnToRaw : DEFAULT_RETURN_URL

  if (!tokenRaw || typeof tokenRaw !== "string" || !tokenRaw.trim()) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  let access_token: string
  let refresh_token: string | null = null
  try {
    const parsed = JSON.parse(tokenRaw) as { access_token?: string; refresh_token?: string | null }
    access_token = parsed.access_token ?? ""
    refresh_token = parsed.refresh_token ?? null
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (!access_token) {
    return NextResponse.redirect(new URL("/login", request.url))
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

  const { error } = await supabase.auth.setSession({ access_token, refresh_token: refresh_token ?? "" })
  if (error) {
    console.error("[apply-and-redirect] setSession failed:", error.message)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const response = NextResponse.redirect(redirectUrl)

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
