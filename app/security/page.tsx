import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SecurityManager } from "@/components/security/security-manager"

export const metadata = {
  title: "Security & sessions | Street Taco Accounts",
  description: "Manage sessions and sign out from all devices.",
}

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: sessionData } = await supabase.auth.getSession()
  const { return_to } = await searchParams

  return (
    <div className="min-h-screen px-4 py-8">
      <SecurityManager
        session={sessionData?.session ?? null}
        returnTo={return_to ?? undefined}
      />
    </div>
  )
}
