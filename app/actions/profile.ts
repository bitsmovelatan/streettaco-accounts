"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/src/type/database.types"

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

export async function updateProfile(payload: {
  full_name?: string | null
  avatar_url?: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const update: ProfileUpdate = {
    full_name: payload.full_name ?? undefined,
    avatar_url: payload.avatar_url ?? undefined,
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)

  if (error) {
    console.error("updateProfile:", error)
    return { error: error.message }
  }
  return {}
}

export async function getProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, tos_accepted, privacy_accepted")
    .eq("id", user.id)
    .single()

  if (error || !data) return null
  return { ...data, email: user.email ?? "" }
}
