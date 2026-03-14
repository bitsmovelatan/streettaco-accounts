"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Auth callback page: runs in the browser so we can read the URL hash.
 * Supabase sometimes redirects with tokens in the fragment (#access_token=...).
 * The fragment is never sent to the server, so we must handle it here.
 *
 * - If hash contains access_token (and refresh_token): setSession, show COMPLETED, then redirect to
 *   /auth/callback/complete so the server can update auth_sync and redirect.
 * - If query contains code: redirect to /api/auth/exchange (server exchanges code, sets cookies, updates auth_sync).
 * - Otherwise: redirect to /login?error=no_code.
 */
export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const handled = useRef(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || handled.current) return

    const hash = window.location.hash
    const params = new URLSearchParams(searchParams.toString())

    const expectedMatch = params.get("expected_match")
    const returnTo = params.get("return_to")
    const next = params.get("next")
    const code = params.get("code")

    const buildCompleteUrl = () => {
      const u = new URL("/auth/callback/complete", window.location.origin)
      if (expectedMatch) u.searchParams.set("expected_match", expectedMatch)
      if (returnTo) u.searchParams.set("return_to", returnTo)
      if (next) u.searchParams.set("next", next)
      return u.toString()
    }

    const buildLoginUrl = (error: string) => {
      const u = new URL("/login", window.location.origin)
      u.searchParams.set("error", error)
      if (returnTo) u.searchParams.set("return_to", returnTo)
      if (next) u.searchParams.set("next", next)
      return u.toString()
    }

    // Tokens in hash (Supabase implicit / magic link flow)
    if (hash && hash.startsWith("#")) {
      const hashParams = new URLSearchParams(hash.slice(1))
      const access_token = hashParams.get("access_token")
      const refresh_token = hashParams.get("refresh_token") ?? ""

      if (access_token) {
        handled.current = true
        const supabase = createClient()
        supabase.auth
          .setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              window.location.href = buildLoginUrl("auth_failed")
              return
            }
            setCompleted(true)
            setTimeout(() => { window.location.href = buildCompleteUrl() }, 1200)
          })
          .catch(() => {
            window.location.href = buildLoginUrl("auth_failed")
          })
        return
      }
    }

    // Code in query (PKCE / server-side exchange)
    if (code) {
      handled.current = true
      const u = new URL("/api/auth/exchange", window.location.origin)
      u.searchParams.set("code", code)
      if (expectedMatch) u.searchParams.set("expected_match", expectedMatch)
      if (returnTo) u.searchParams.set("return_to", returnTo)
      if (next) u.searchParams.set("next", next)
      window.location.href = u.toString()
      return
    }

    handled.current = true
    window.location.href = buildLoginUrl("no_code")
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {completed ? (
        <>
          <p className="text-2xl font-semibold tracking-wide text-emerald-500">COMPLETED</p>
          <p className="text-sm text-muted-foreground">Redirecting to your destination…</p>
        </>
      ) : (
        <p className="text-muted-foreground">Completing sign-in…</p>
      )}
    </div>
  )
}
