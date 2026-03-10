import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { SHARED_COOKIE_OPTIONS, DEFAULT_RETURN_URL, isProduction } from "@/lib/constants"

/**
 * OAuth callback (IdP): exchange code for session in accounts only, set cookie on .streettaco.com.au,
 * then redirect to plus (or /consent) with a clean URL — no code parameter, so plus never sees the code.
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

  if (error || !data.user) {
    console.error("[auth/callback] Session error:", error?.message)
    const loginUrl = new URL("/login?error=auth", requestUrl.origin)
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    return NextResponse.redirect(loginUrl)
  }

  const userId = data.user.id

  const fullName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null
  const avatarUrl = data.user.user_metadata?.avatar_url ?? null

  await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      avatar_url: avatarUrl,
      status_account: "ACTIVE",
    },
    { onConflict: "id" }
  )

  const { data: profile } = await supabase
    .from("profiles")
    .select("tos_accepted, privacy_accepted")
    .eq("id", userId)
    .single()

  const needsConsent = !profile?.tos_accepted || !profile?.privacy_accepted
  const origin = requestUrl.origin
  let redirectTarget: URL

  if (needsConsent) {
    redirectTarget = new URL("/consent", origin)
    if (returnTo) redirectTarget.searchParams.set("return_to", returnTo)
  } else {
    const cleanPlusUrl = (() => {
      if (!returnTo) return DEFAULT_RETURN_URL
      try {
        const u = new URL(returnTo)
        return u.origin + (u.pathname || "/")
      } catch {
        return DEFAULT_RETURN_URL
      }
    })()
    redirectTarget = new URL(cleanPlusUrl)
  }

  const res = NextResponse.redirect(redirectTarget)

  for (const { name, value, options } of cookiesToSet) {
    res.cookies.set(name, value, {
      path: SHARED_COOKIE_OPTIONS.path,
      maxAge: (options?.maxAge as number) ?? undefined,
      httpOnly: SHARED_COOKIE_OPTIONS.httpOnly,
      secure: isProduction() ? SHARED_COOKIE_OPTIONS.secure : false,
      sameSite: SHARED_COOKIE_OPTIONS.sameSite,
      ...(isProduction() && { domain: SHARED_COOKIE_OPTIONS.domain }),
    })
  }

  return res
}