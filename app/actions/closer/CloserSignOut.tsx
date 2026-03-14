"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

/** Signs out the validator so they don't keep a session. Runs after the message is already visible (server-rendered). */
export function CloserSignOut() {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    createClient().auth.signOut()
  }, [])
  return null
}
