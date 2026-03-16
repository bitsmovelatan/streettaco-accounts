import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

/**
 * GET /auth/callback/complete?expected_match=...&return_to=...&next=...
 * Called after the client has set the session from the hash (setSession).
 * Updates auth_sync so the waiting page (e.g. on another device) can see verification, then redirects.
 * If expected_match is missing (e.g. when Supabase redirected to /login), updates any pending auth_sync row for this email.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const expectedMatchParam = requestUrl.searchParams.get("expected_match")
  const returnTo = requestUrl.searchParams.get("return_to")
  const next = requestUrl.searchParams.get("next")

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("[auth/callback/complete] Token no válido o sesión manipulada", userError?.message)
    const loginUrl = new URL("/login", requestUrl.origin)
    loginUrl.searchParams.set("error", "no_session")
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    if (next) loginUrl.searchParams.set("next", next)
    return NextResponse.redirect(loginUrl)
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const loginUrl = new URL("/login", requestUrl.origin)
    loginUrl.searchParams.set("error", "no_session")
    if (returnTo) loginUrl.searchParams.set("return_to", returnTo)
    if (next) loginUrl.searchParams.set("next", next)
    return NextResponse.redirect(loginUrl)
  }

  const cleanEmail = user.email?.toLowerCase().trim() ?? null
  const tokenPayload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? null,
  })

  if (expectedMatchParam !== null && expectedMatchParam !== "" && cleanEmail) {
    const expectedMatch = parseInt(expectedMatchParam, 10)
    if (!Number.isNaN(expectedMatch) && expectedMatch >= 10 && expectedMatch <= 99) {
      const matchNumber = expectedMatch
      console.log("[auth/callback/complete] attempting auth_sync update", {
        email: cleanEmail,
        matchNumber,
      })

      const { data: updateData, error: updateError } = await supabaseAdmin
        .from("auth_sync")
        .update({
          status: "verified",
          token: tokenPayload,
        })
        .match({
          email: cleanEmail,
          match_number: matchNumber,
          status: "pending",
        })
        .select("id")

      if (updateError) {
        console.error("[auth/callback/complete] auth_sync update failed:", updateError)
      } else if (!updateData || updateData.length === 0) {
        console.error(
          "[auth/callback/complete] auth_sync update found no rows to update. Check email/match_number/status.",
          { email: cleanEmail, matchNumber }
        )
      } else {
        console.log("[auth/callback/complete] auth_sync update succeeded", {
          email: cleanEmail,
          matchNumber,
        })
      }
    }
  } else if (cleanEmail) {
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("auth_sync")
      .update({ status: "verified", token: tokenPayload })
      .match({
        email: cleanEmail,
        status: "pending",
      })
      .select("id")

    if (updateError) {
      console.error("[auth/callback/complete] auth_sync update (no expected_match) failed:", updateError)
    } else if (!updateData || updateData.length === 0) {
      console.error(
        "[auth/callback/complete] auth_sync update (no expected_match) found no rows to update.",
        { email: cleanEmail }
      )
    } else {
      console.log("[auth/callback/complete] auth_sync update (no expected_match) succeeded", {
        email: cleanEmail,
      })
    }
  }

  // Validator (e.g. mobile): do NOT redirect to return_to; send to completed page so they can close the tab.
  const completedUrl = new URL("/auth/completed", requestUrl.origin)
  return NextResponse.redirect(completedUrl.toString())
}
