import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Nunca expongas esta clave al cliente (navegador)
  )
}

// Singleton for server-side updates (bypasses RLS with service_role).
export const supabaseAdmin = createAdminClient()

export default supabaseAdmin
