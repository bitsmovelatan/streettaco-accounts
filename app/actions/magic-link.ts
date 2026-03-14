"use server"

import { createClient } from "@/lib/supabase/server"
import { parseEmail, parseReturnTo } from "@/lib/validations"

const ACCOUNTS_ORIGIN =
  process.env.NEXT_PUBLIC_ACCOUNTS_ORIGIN || "http://localhost:3000"

/**
 * Generates a random 2-digit number (10–99) for number-matching magic link flow.
 */
function generateMatchNumber(): number {
  return Math.floor(10 + Math.random() * 90)
}

export type RequestMagicLinkResult =
  | { ok: true; matchNumber: number; emailRedirectTo: string; waitingPath: string }
  | { ok: false; error: string }

/**
 * When a user requests a magic link:
 * 1. Validate email and return_to (trusted subdomain).
 * 2. Generate a 2-digit match number and save in auth_sync (status 'pending').
 * 3. Return match number, callback URL for the email, and path to the waiting page.
 */
export async function requestMagicLink(
  email: string,
  returnTo: string | null,
  next: string | null
): Promise<RequestMagicLinkResult> {
  const emailResult = parseEmail(email)
  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error }
  }
  const normalizedEmail = emailResult.email

  const returnUrl = returnTo ?? next ?? null
  const returnParsed = returnUrl ? parseReturnTo(returnUrl) : null
  const safeReturnTo =
    returnParsed?.ok === true ? returnParsed.url : null

  const matchNumber = generateMatchNumber()
  const supabase = await createClient()

  const { error: insertError } = await supabase.from("auth_sync").insert({
    email: normalizedEmail,
    match_number: matchNumber,
    status: "pending",
  })

  if (insertError) {
    console.error("[requestMagicLink] auth_sync insert failed:", insertError)
    return { ok: false, error: "Could not start sign-in. Please try again." }
  }

  const callbackUrl = new URL("/auth/callback", ACCOUNTS_ORIGIN)
  callbackUrl.searchParams.set("expected_match", String(matchNumber))
  if (safeReturnTo) callbackUrl.searchParams.set("return_to", safeReturnTo)
  if (next && safeReturnTo !== next) callbackUrl.searchParams.set("next", next)

  const waitingPath = new URL("/auth/waiting", ACCOUNTS_ORIGIN)
  waitingPath.searchParams.set("email", normalizedEmail)
  waitingPath.searchParams.set("match_number", String(matchNumber))
  if (safeReturnTo) waitingPath.searchParams.set("return_to", safeReturnTo)

  return {
    ok: true,
    matchNumber,
    emailRedirectTo: callbackUrl.toString(),
    waitingPath: waitingPath.pathname + waitingPath.search,
  }
}

export type CheckMagicLinkVerifiedResult =
  | { ok: true; token: string }
  | { ok: false }

/**
 * Check if the magic link was verified (callback already ran and updated auth_sync).
 * Used by the waiting page as a polling fallback when Realtime does not fire
 * (e.g. table not in publication, or user opened link in another tab).
 * Requires auth_sync RLS to allow SELECT for anon on the matching row.
 */
export async function checkMagicLinkVerified(
  email: string,
  matchNumber: number
): Promise<CheckMagicLinkVerifiedResult> {
  const normalizedEmail = email.trim().toLowerCase()
  if (Number.isNaN(matchNumber) || matchNumber < 10 || matchNumber > 99) {
    return { ok: false }
  }
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from("auth_sync")
    .select("token")
    .eq("email", normalizedEmail)
    .eq("match_number", matchNumber)
    .eq("status", "verified")
    .maybeSingle()

  if (error || !row?.token) return { ok: false }
  return { ok: true, token: row.token as string }
}
