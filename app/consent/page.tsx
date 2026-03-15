import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConsentManager } from "@/components/consent/consent-manager"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import { parseReturnTo } from "@/lib/validations"
import { getPendingLegalDocumentsForUser } from "@/app/actions/legal"

export const metadata = {
  title: "Legal consent | Street Taco Accounts",
  description: "Accept Terms of Service, Privacy Policy and legal documents to continue.",
}

async function getOrigin() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto === "https" ? "https" : "http"}://${host}`
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const params = await searchParams
  const origin = await getOrigin()
  const parsedReturn = params.return_to ? parseReturnTo(params.return_to) : null
  const safeReturnTo = parsedReturn?.ok === true ? parsedReturn.url : null

  if (!user) {
    const loginUrl = new URL("/login", origin)
    loginUrl.searchParams.set("return_to", safeReturnTo ?? `${origin}/consent`)
    redirect(loginUrl.toString())
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tos_accepted, privacy_accepted")
    .eq("id", user.id)
    .single()

  const needsProfileConsent = !profile?.tos_accepted || !profile?.privacy_accepted
  const { pendingDocuments } = await getPendingLegalDocumentsForUser()
  const needsLegalDocsConsent = pendingDocuments.length > 0

  if (!needsProfileConsent && !needsLegalDocsConsent) {
    redirect(safeReturnTo ?? DEFAULT_RETURN_URL)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <ConsentManager
        returnToFromServer={safeReturnTo ?? undefined}
        needsProfileConsent={needsProfileConsent}
        pendingLegalDocuments={pendingDocuments}
      />
    </div>
  )
}
