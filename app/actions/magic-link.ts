"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseEmail, parseReturnTo } from "@/lib/validations"
import { Resend } from "resend"

/** Origin for accounts app. Magic-link redirect always goes here (must match Supabase Redirect URLs). */
const ACCOUNTS_ORIGIN =
  process.env.NEXT_PUBLIC_ACCOUNTS_ORIGIN || "http://localhost:3000"

function buildNumberMatchEmailHtml(matchNumber: number, confirmUrl: string): string {
  const decoys: number[] = []
  while (decoys.length < 3) {
    const n = Math.floor(10 + Math.random() * 90)
    if (n !== matchNumber && !decoys.includes(n)) decoys.push(n)
  }
  const allNumbers = [matchNumber, ...decoys].sort(() => Math.random() - 0.5)
  const cells = allNumbers
    .map(
      (n) =>
        n === matchNumber
          ? `<td align="center" style="padding:12px;"><a href="${confirmUrl}" style="display:inline-block;padding:16px 24px;background:#f59e0b;color:#000;font-weight:bold;font-size:1.25rem;text-decoration:none;border-radius:8px;">${n}</a></td>`
          : `<td align="center" style="padding:12px;"><span style="display:inline-block;padding:16px 24px;background:#374151;color:#9ca3af;font-size:1.25rem;border-radius:8px;">${n}</span></td>`
    )
    .join("")
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;padding:24px;">
  <div style="max-width:400px;margin:0 auto;">
    <p style="font-size:18px;font-weight:600;">Sign in to StreetTaco ID</p>
    <p style="color:#a1a1aa;margin-top:8px;">Select the number you see in the app:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr>${cells}</tr>
    </table>
    <p style="margin-top:24px;font-size:14px;color:#71717a;">Click the number that matches the one on your screen to sign in securely.</p>
    <p style="margin-top:16px;font-size:12px;color:#52525b;">If you didn't request this, you can ignore this email.</p>
  </div>
</body>
</html>
  `.trim()
}

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
  // Use admin client so INSERT bypasses RLS (service_role). Avoids 42501 when anon/authenticated policies don't apply.
  const admin = createAdminClient()
  const { data: insertData, error: insertError } = await admin
    .from("auth_sync")
    .insert({
      email: normalizedEmail,
      match_number: matchNumber,
      status: "pending",
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("[requestMagicLink] auth_sync insert failed:", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
    })
    return { ok: false, error: "Could not start sign-in. Please try again." }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[requestMagicLink] auth_sync insert ok:", { id: insertData?.id, email: normalizedEmail, match_number: matchNumber })
  }

  // Always accounts origin so Supabase redirects to accounts (not Plus). Must be allowlisted in Supabase → URL Configuration.
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

/**
 * Number-match magic link: insert auth_sync, generate link via Supabase Admin (no Supabase email),
 * send our own email with the match number and decoy numbers so the user selects the right one.
 * The link in the email goes to our callback (accounts) with expected_match, not to Plus.
 * Requires: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM (e.g. "StreetTaco <noreply@yourdomain.com>").
 */
export async function sendMagicLinkWithNumberMatch(
  email: string,
  returnTo: string | null,
  next: string | null
): Promise<RequestMagicLinkResult> {
  const result = await requestMagicLink(email, returnTo, next)
  if (!result.ok) return result

  const { matchNumber, emailRedirectTo: callbackUrl, waitingPath } = result
  const normalizedEmail = email.trim().toLowerCase()

  let actionLink: string
  try {
    const admin = createAdminClient()
    // redirectTo must be allowlisted in Supabase Dashboard → Auth → URL Configuration (Redirect URLs).
    // If not, Supabase redirects to Site URL (often Plus); set Site URL to accounts.streettaco.com.au and add callback to Redirect URLs.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: { redirectTo: callbackUrl },
    })
    if (process.env.NODE_ENV !== "production") {
      console.log("[sendMagicLinkWithNumberMatch] redirectTo passed to generateLink:", callbackUrl)
    }
    if (error) {
      console.error("[sendMagicLinkWithNumberMatch] generateLink failed:", error)
      return { ok: false, error: "Could not create sign-in link. Please try again." }
    }
    const props = (data as { properties?: { action_link?: string }; action_link?: string })?.properties
    actionLink = props?.action_link ?? (data as { action_link?: string })?.action_link ?? ""
    if (!actionLink) {
      console.error("[sendMagicLinkWithNumberMatch] no action_link in response:", data)
      return { ok: false, error: "Could not create sign-in link. Please try again." }
    }
  } catch (e) {
    console.error("[sendMagicLinkWithNumberMatch] admin/generateLink error:", e)
    return { ok: false, error: "Server error. Please try again." }
  }

  const resendKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM ?? "StreetTaco <onboarding@resend.dev>"
  if (!resendKey) {
    console.error("[sendMagicLinkWithNumberMatch] RESEND_API_KEY not set")
    return { ok: false, error: "Email is not configured. Please try again later." }
  }

  const resend = new Resend(resendKey)
  const html = buildNumberMatchEmailHtml(matchNumber, actionLink)
  const { error: sendError } = await resend.emails.send({
    from: resendFrom,
    to: [normalizedEmail],
    subject: `Sign in to StreetTaco ID — select number ${matchNumber}`,
    html,
  })
  if (sendError) {
    console.error("[sendMagicLinkWithNumberMatch] Resend failed:", sendError)
    return { ok: false, error: "Could not send email. Please try again." }
  }

  return {
    ok: true,
    matchNumber,
    emailRedirectTo: callbackUrl,
    waitingPath: waitingPath,
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
