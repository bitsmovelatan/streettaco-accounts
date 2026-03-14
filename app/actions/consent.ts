"use server"

import { createClient } from "@/lib/supabase/server"

const TOS_VERSION = "1.0"
const PRIVACY_VERSION = "1.0"

/**
 * Accept ToS & Privacy (profiles) and set app_metadata so Plus can consider consent done.
 */
export async function acceptConsent(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("profiles")
    .update({
      tos_accepted: true,
      tos_accepted_at: now,
      tos_version: TOS_VERSION,
      privacy_accepted: true,
      privacy_accepted_at: now,
      privacy_version: PRIVACY_VERSION,
    })
    .eq("id", user.id)

  if (error) {
    console.error("acceptConsent:", error)
    return { error: error.message }
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      consent_accepted: true,
      consent_timestamp: now,
    },
  })
  if (metaError) {
    console.error("acceptConsent updateUser:", metaError)
    // non-fatal: profile consent is saved
  }
  return {}
}
