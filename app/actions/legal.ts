"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export type LegalDocument = {
  id: string
  type: string
  version: string
  content_url: string | null
  is_active: boolean
  created_at: string
}

/** Returns active legal documents that the current user has not yet consented to. */
export async function getPendingLegalDocumentsForUser(): Promise<{
  pendingDocuments: LegalDocument[]
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { pendingDocuments: [], error: "Not authenticated" }
  }

  const { data: documents, error: docsError } = await supabase
    .from("legal_documents")
    .select("id, type, version, content_url, is_active, created_at")
    .eq("is_active", true)
    .order("type")

  if (docsError) {
    console.error("getPendingLegalDocumentsForUser documents:", docsError)
    return { pendingDocuments: [], error: docsError.message }
  }

  const { data: consents, error: consentsError } = await supabase
    .from("account_consents")
    .select("document_id")
    .eq("account_id", user.id)

  if (consentsError) {
    console.error("getPendingLegalDocumentsForUser consents:", consentsError)
    return { pendingDocuments: [], error: consentsError.message }
  }

  const consentedIds = new Set((consents ?? []).map((c) => c.document_id))
  const pendingDocuments = (documents ?? []).filter(
    (d) => !consentedIds.has(d.id)
  ) as LegalDocument[]

  return { pendingDocuments }
}

export type ConsentAuditPayload = {
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Records consent for the given document ids for the current user.
 * Uses client-provided audit payload when given; otherwise falls back to request headers.
 */
export async function recordConsents(
  documentIds: string[],
  audit?: ConsentAuditPayload
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  let ipAddress: string | null = audit?.ipAddress ?? null
  let userAgent: string | null = audit?.userAgent ?? null
  if (ipAddress === undefined || userAgent === undefined) {
    const h = await headers()
    if (ipAddress === undefined) {
      ipAddress =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null
    }
    if (userAgent === undefined) {
      userAgent = h.get("user-agent") ?? null
    }
  }

  const rows = documentIds.map((document_id) => ({
    account_id: user.id,
    document_id,
    ip_address: ipAddress,
    user_agent: userAgent,
  }))

  const { error } = await supabase.from("account_consents").insert(rows)

  if (error) {
    console.error("recordConsents:", error)
    return { error: error.message }
  }
  return {}
}
