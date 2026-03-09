"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { logoutEverywhere } from "@/app/actions/security"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import type { Session } from "@supabase/supabase-js"
import Image from "next/image"

type Props = {
  session: Session | null
  returnTo?: string
}

export function SecurityManager({ session, returnTo }: Props) {
  const [loggingOut, setLoggingOut] = useState(false)
  const backHref = returnTo ?? DEFAULT_RETURN_URL

  async function handleLogoutEverywhere() {
    setLoggingOut(true)
    await logoutEverywhere()
    window.location.href = "/login" + (returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "")
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
        <h1 className="text-2xl font-bold text-foreground">Security</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <p className="text-sm text-muted-foreground">
            You are signed in on this device. Sign out everywhere to clear your
            session across the whole Street Taco domain (.streettaco.com.au).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {session && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">This device</p>
              <p className="text-muted-foreground">
                {session.user?.created_at
                  ? new Date(session.user.created_at).toLocaleString()
                  : "Current session"}
              </p>
            </div>
          )}
          <Button
            variant="destructive"
            onClick={handleLogoutEverywhere}
            disabled={loggingOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out…" : "Sign out everywhere"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
