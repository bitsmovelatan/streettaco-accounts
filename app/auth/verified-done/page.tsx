"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Shown only on the device that clicked the number in the email (validator).
 * We already updated auth_sync in /auth/callback/complete. This page signs the validator out
 * so they don't keep a session, and tells them to close the tab. The waiting device will
 * get the session from auth_sync and redirect to Plus.
 */
export default function VerifiedDonePage() {
  const signedOut = useRef(false)

  useEffect(() => {
    if (signedOut.current) return
    signedOut.current = true
    const supabase = createClient()
    supabase.auth.signOut()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4 text-white">
      <p className="text-2xl font-semibold tracking-wide text-emerald-400">
        CONNECTED
      </p>
      <p className="max-w-sm text-center text-sm text-zinc-400">
        You can close this tab. Sign-in will complete on your other device.
      </p>
    </div>
  )
}
