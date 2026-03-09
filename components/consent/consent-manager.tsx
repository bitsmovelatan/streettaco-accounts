"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/card"
import { acceptConsent } from "@/app/actions/consent"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import Image from "next/image"

/**
 * Mobile-optimized legal acceptance. On submit, updates public.profiles with tos_accepted, privacy_accepted, accepted_at and version.
 */
export function ConsentManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to") ?? DEFAULT_RETURN_URL
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setAccepting(true)
    setError(null)
    const result = await acceptConsent()
    setAccepting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push(returnTo)
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 flex justify-center">
        <Image
          src="/images/streettaco-logo.svg"
          alt="Street Taco"
          width={64}
          height={64}
          className="object-contain"
        />
      </div>
      <GlassCard className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">
          Terms &amp; Privacy
        </h1>
        <p className="text-sm text-muted-foreground">
          To use the Street Taco ecosystem we need you to accept our Terms of
          Service and Privacy Policy.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Terms of Service</li>
          <li>Privacy Policy</li>
        </ul>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full"
        >
          {accepting ? "Accepting…" : "I accept"}
        </Button>
      </GlassCard>
    </div>
  )
}
