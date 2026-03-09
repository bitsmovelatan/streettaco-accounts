import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { SHARED_COOKIE_OPTIONS, DEFAULT_RETURN_URL, isProduction } from "@/lib/constants"

/**
 * OAuth callback: exchange code for session, then check public.profiles for tos_accepted and privacy_accepted.
 * Redirect to /consent if missing; otherwise redirect to return_to or DEFAULT_RETURN_URL.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const returnTo = requestUrl.searchParams.get("return_to") ?? ""

  if (!code) {
    const loginUrl = new URL("/login", requestUrl.origin)
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
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
        setAll(cookiesToSetFromSupabase) {
          cookiesToSetFromSupabase.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options })
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message)
    const loginUrl = new URL("/login?error=auth", requestUrl.origin)
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    return NextResponse.redirect(loginUrl)
  }

  const userId = data.user?.id
  if (!userId) {
    const loginUrl = new URL("/login?error=auth", requestUrl.origin)
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    return NextResponse.redirect(loginUrl)
  }

  // Ensure profile exists (upsert by id)
  const fullName =
    data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? null
  const avatarUrl = data.user?.user_metadata?.avatar_url ?? null
  await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      avatar_url: avatarUrl,
      status_account: "ACTIVE",
    },
    { onConflict: "id" }
  )

  // Check consent: redirect to /consent if tos_accepted or privacy_accepted missing
  const { data: profile } = await supabase
    .from("profiles")
    .select("tos_accepted, privacy_accepted")
    .eq("id", userId)
    .single()

  const needsConsent = !profile?.tos_accepted || !profile?.privacy_accepted
  const origin =
    process.env.NODE_ENV === "development"
      ? requestUrl.origin
      : request.headers.get("x-forwarded-host")
        ? `https://${request.headers.get("x-forwarded-host")}`
        : requestUrl.origin

  const redirectTarget = needsConsent
    ? new URL("/consent", origin)
    : new URL(returnTo || DEFAULT_RETURN_URL)
  if (needsConsent && returnTo) redirectTarget.searchParams.set("return_to", returnTo)

  const res = NextResponse.redirect(redirectTarget)

  for (const { name, value, options } of cookiesToSet) {
    const opts = isProduction()
      ? { ...options, ...SHARED_COOKIE_OPTIONS }
      : options
    res.cookies.set(name, value, {
      path: (opts?.path as string) ?? "/",
      maxAge: opts?.maxAge as number | undefined,
      httpOnly: (opts?.httpOnly as boolean) ?? true,
      secure: (opts?.secure as boolean) ?? isProduction(),
      sameSite: (opts?.sameSite as "lax" | "strict" | "none") ?? "lax",
      ...(isProduction() && { domain: SHARED_COOKIE_OPTIONS.domain }),
    })
  }

  return res
}
