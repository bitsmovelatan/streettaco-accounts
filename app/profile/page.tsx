import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileEditor } from "@/components/profile/profile-editor"

export const metadata = {
  title: "Profile | Street Taco Accounts",
  description: "Edit your name and avatar.",
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", user.id)
    .single()

  const { return_to } = await searchParams
  return (
    <div className="min-h-screen px-4 py-8">
      <ProfileEditor
        initialFullName={profile?.full_name ?? null}
        initialAvatarUrl={profile?.avatar_url ?? null}
        email={user.email ?? ""}
        returnTo={return_to ?? undefined}
      />
    </div>
  )
}
