import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isProduction } from "@/lib/constants"

const COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/" as const,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const return_to = requestUrl.searchParams.get("return_to") || "https://plus.streettaco.com.au"

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
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
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
  }

  const cleanUrl = (() => {
    try {
      const u = new URL(return_to)
      return u.origin + (u.pathname || "/")
    } catch {
      return "https://plus.streettaco.com.au"
    }
  })()

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