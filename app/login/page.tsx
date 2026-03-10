"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

/**
 * Branded login: if already signed in, redirect to callback flow or return_to; else start Google OAuth.
 * Mounted pattern: first frame is a neutral placeholder so server and client match; then session check runs.
 */
export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = mounted ? (searchParams.get("return_to") ?? "") : ""

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const params = new URLSearchParams()
        if (returnTo) params.set("return_to", returnTo)
        router.replace(`/?${params.toString()}`)
        return
      }
      const redirectTo = new URL("/auth/callback", window.location.origin)
      if (returnTo) redirectTo.searchParams.set("return_to", returnTo)
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
        },
      })
    })
  }, [mounted, router, returnTo])

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <Image
            src="/images/streettaco-logo.svg"
            alt="Street Taco"
            width={80}
            height={80}
            className="object-contain"
            priority
          />
        </div>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Street Taco Accounts
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Signing in with Google...</p>
      </div>
    </div>
  )
}
