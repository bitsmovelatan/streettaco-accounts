"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Sign out from all sessions (global logout for .streettaco.com.au).
 * Clears the session so the user must sign in again on any subdomain.
 */
export async function logoutEverywhere(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "global" })
}
