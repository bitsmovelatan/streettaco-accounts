"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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

/**
 * Profile form. Uses mounted pattern so server first paint matches client (skeleton) and avoids hydration mismatch with user data.
 */
export function ProfileEditor({
  initialFullName,
  initialAvatarUrl,
  email,
  returnTo,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!mounted) {
    return (
      <div className="mx-auto max-w-lg">
        <Skeleton className="mb-6 h-4 w-16" />
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-4 w-12" />
              <Skeleton className="mt-1 h-9 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-1 h-9 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-9 w-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    )
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
