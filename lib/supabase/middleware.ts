import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { AUTH_STORAGE_KEY, SHARED_COOKIE_OPTIONS, isProduction } from "@/lib/constants"
import { parseReturnTo } from "@/lib/validations"

/**
 * Master middleware for the IdP.
 * - Keeps Supabase session in sync using the shared cookie domain (.streettaco.com.au).
 * - For /login: do NOT redirect even if a session exists; let the request reach the page so
 *   the user can see the Active Session UI (email, expires in X min/hours, continue or sign out).
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next({ request })
  }

  const code = request.nextUrl.searchParams.get("code")
  if (pathname === "/" && code) {
    const callbackUrl = new URL("/auth/callback", request.url)
    request.nextUrl.searchParams.forEach((v, k) => callbackUrl.searchParams.set(k, v))
    return NextResponse.redirect(callbackUrl)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            const merged = isProduction()
              ? { ...options, ...SHARED_COOKIE_OPTIONS }
              : options
            supabaseResponse.cookies.set(name, value, merged)
          })
        },
      },
      cookieOptions: {
        name: AUTH_STORAGE_KEY,
        path: "/",
        ...(isProduction() && SHARED_COOKIE_OPTIONS),
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Do not redirect away from /login when session exists; login page shows Active Session card
  // and lets the user choose "Continue to Dashboard" or "Sign out and use another account".
  if (pathname === "/login") {
    return supabaseResponse
  }

  const protectedPaths = ["/profile", "/security", "/consent"]
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url)
    const rawReturnTo = request.nextUrl.searchParams.get("return_to") || request.url
    const parsed = parseReturnTo(rawReturnTo)
    if (parsed.ok) loginUrl.searchParams.set("return_to", parsed.url)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
