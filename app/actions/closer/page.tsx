"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Shown on the device that clicked the number in the email (validator).
 * After number verification, callback/complete redirects here. We sign the validator out
 * so they don't keep a session; the waiting device gets the session via auth_sync and redirects to Plus.
 */
export default function ActionsCloserPage() {
  const signedOut = useRef(false)

  useEffect(() => {
    if (signedOut.current) return
    signedOut.current = true
    const supabase = createClient()
    supabase.auth.signOut()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <p className="text-center text-sm text-zinc-600">
        You can close this tab. Sign-in will complete on your other device.
      </p>
    </div>
  )
}
