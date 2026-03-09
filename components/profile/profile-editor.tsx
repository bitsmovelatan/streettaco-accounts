"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateProfile } from "@/app/actions/profile"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import { cn } from "@/lib/utils"
import Image from "next/image"

type Props = {
  initialFullName: string | null
  initialAvatarUrl: string | null
  email: string
  returnTo?: string
}

export function ProfileEditor({
  initialFullName,
  initialAvatarUrl,
  email,
  returnTo,
}: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  const backHref = returnTo ?? DEFAULT_RETURN_URL

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const result = await updateProfile({
      full_name: fullName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    })
    setSaving(false)
    if (result.error) {
      setMessage({ type: "error", text: result.error })
      return
    }
    setMessage({ type: "ok", text: "Profile updated." })
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <Image
          src="/images/streettaco-logo.svg"
          alt="Street Taco"
          width={40}
          height={40}
          className="object-contain"
        />
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </div>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="mt-1 bg-muted/50 cursor-not-allowed"
              />
            </div>
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
            {message && (
              <p
                className={cn(
                  "text-sm",
                  message.type === "ok" ? "text-primary" : "text-destructive"
                )}
              >
                {message.text}
              </p>
            )}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
