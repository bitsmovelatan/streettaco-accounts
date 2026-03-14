"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { acceptConsent } from "@/app/actions/consent"
import { recordConsents, type LegalDocument } from "@/app/actions/legal"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import Image from "next/image"

const TYPE_LABELS: Record<string, string> = {
  terms_of_service: "Terms of Service",
  privacy_policy: "Privacy Policy",
  tokenization_rules: "Tokenization Rules",
}

type Props = {
  returnToFromServer?: string
  needsProfileConsent: boolean
  pendingLegalDocuments: LegalDocument[]
}

/**
 * Unified consent: (1) ToS & Privacy in profiles, (2) optional legal_documents in account_consents.
 * Used only by Accounts; Plus redirects here when consent is pending.
 */
export function ConsentManager({
  returnToFromServer,
  needsProfileConsent,
  pendingLegalDocuments,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const returnTo = returnToFromServer ?? DEFAULT_RETURN_URL
  const [step, setStep] = useState<1 | 2>(needsProfileConsent ? 1 : 2)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [legalAccepted, setLegalAccepted] = useState<Record<string, boolean>>(
    () => Object.fromEntries(pendingLegalDocuments.map((d) => [d.id, false]))
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleProfileAccept() {
    setAccepting(true)
    setError(null)
    const result = await acceptConsent()
    setAccepting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (pendingLegalDocuments.length > 0) {
      setStep(2)
    } else {
      router.push(returnTo)
    }
  }

  async function handleLegalAccept() {
    const allAccepted = pendingLegalDocuments.every((d) => legalAccepted[d.id])
    if (!allAccepted) return
    setAccepting(true)
    setError(null)
    const ipAddress = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json() as Promise<{ ip?: string }>)
      .then((d) => d.ip ?? null)
      .catch(() => null)
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null
    const result = await recordConsents(
      pendingLegalDocuments.map((d) => d.id),
      { ipAddress, userAgent }
    )
    setAccepting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push(returnTo)
  }

  const toggleLegal = (id: string) =>
    setLegalAccepted((prev) => ({ ...prev, [id]: !prev[id] }))
  const allLegalAccepted = pendingLegalDocuments.every((d) => legalAccepted[d.id])

  if (!mounted) {
    return (
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex justify-center">
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>
        <GlassCard className="space-y-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[75%]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="flex justify-center">
        <Image
          src="/images/streettaco-logo.svg"
          alt="Street Taco"
          width={64}
          height={64}
          className="object-contain"
        />
      </div>

      {step === 1 && (
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
            onClick={handleProfileAccept}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? "Accepting…" : "I accept"}
          </Button>
        </GlassCard>
      )}

      {step === 2 && pendingLegalDocuments.length > 0 && (
        <GlassCard className="space-y-6">
          <h1 className="text-xl font-bold text-foreground">
            Legal documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Accept the current versions of the following documents to continue.
          </p>
          <ul className="space-y-4">
            {pendingLegalDocuments.map((doc) => (
              <li
                key={doc.id}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`consent-${doc.id}`}
                    checked={legalAccepted[doc.id] ?? false}
                    onChange={() => toggleLegal(doc.id)}
                    className="mt-1 rounded border-border text-primary focus:ring-primary"
                    aria-describedby={`consent-desc-${doc.id}`}
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`consent-${doc.id}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      I accept the {TYPE_LABELS[doc.type] ?? doc.type} (v{doc.version})
                    </label>
                    <p id={`consent-desc-${doc.id}`} className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      {doc.content_url ? (
                        <a
                          href={doc.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline hover:no-underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Read document
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>No document link</span>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            onClick={handleLegalAccept}
            disabled={!allLegalAccepted || accepting}
            className="w-full"
          >
            {accepting ? "Please wait…" : "Confirm and continue"}
          </Button>
        </GlassCard>
      )}
    </div>
  )
}
