import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_RETURN_URL } from "@/lib/constants"

async function getOrigin() {
  const headersList = await headers()
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  return `${proto === "https" ? "https" : "http"}://${host}`
}

/** Home: redirect to login with return_to, or to return_to if already signed in with consent. */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  const { return_to } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const origin = await getOrigin()

  if (!user) {
    const loginUrl = new URL("/login", origin)
    if (return_to) loginUrl.searchParams.set("return_to", return_to)
    redirect(loginUrl.toString())
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tos_accepted, privacy_accepted")
    .eq("id", user.id)
    .single()

  const needsConsent = !profile?.tos_accepted || !profile?.privacy_accepted

  if (needsConsent) {
    const consentUrl = new URL("/consent", origin)
    if (return_to) consentUrl.searchParams.set("return_to", return_to)
    redirect(consentUrl.toString())
  }

  const destination = return_to ?? DEFAULT_RETURN_URL
  redirect(destination)
}
