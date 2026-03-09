import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { SHARED_COOKIE_OPTIONS, isProduction } from "@/lib/constants"

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
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const protectedPaths = ["/profile", "/security", "/consent"]
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url)
    const returnTo = request.nextUrl.searchParams.get("return_to")
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
