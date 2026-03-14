import { createClient } from "@supabase/supabase-js"

/**
 * Server-only. Use for admin operations (e.g. generateLink) that require the service role.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
