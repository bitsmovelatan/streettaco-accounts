"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import { isTrustedReturnUrl } from "@/lib/validations"
import { checkMagicLinkVerified } from "@/app/actions/magic-link"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { Card } from "@/components/ui/card"

const POLL_INTERVAL_MS = 2000

const CAPTION =
  "Check your email and select this number to securely sign in."

type Status = "waiting" | "success" | "error"

export default function AuthWaitingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const matchNumberParam = searchParams.get("match_number")
  const returnToRaw = searchParams.get("return_to") ?? DEFAULT_RETURN_URL

  const [status, setStatus] = useState<Status>("waiting")
  const [mounted, setMounted] = useState(false)

  const matchNumber = matchNumberParam !== null ? parseInt(matchNumberParam, 10) : null
  const isValidNumber =
    matchNumber !== null && !Number.isNaN(matchNumber) && matchNumber >= 10 && matchNumber <= 99
  const returnTo = isTrustedReturnUrl(returnToRaw) ? returnToRaw : DEFAULT_RETURN_URL

  const redirectToReturn = useCallback(() => {
    const url = returnTo.startsWith("http") ? returnTo : new URL(returnTo, window.location.origin).toString()
    window.location.href = url
  }, [returnTo])

  const appliedRef = useRef(false)

  function applyTokenAndRedirect(tokenRaw: string, supabaseClient: ReturnType<typeof createClient>) {
    if (appliedRef.current) return
    let access_token: string
    let refresh_token = ""
    try {
      const parsed = JSON.parse(tokenRaw) as { access_token?: string; refresh_token?: string | null }
      access_token = parsed.access_token ?? tokenRaw
      refresh_token = parsed.refresh_token ?? ""
    } catch {
      access_token = tokenRaw
    }
    if (!access_token) return
    appliedRef.current = true
    supabaseClient.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setStatus("error")
        appliedRef.current = false
        return
      }
      setStatus("success")
      setTimeout(redirectToReturn, 1800)
    })
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !email.trim() || !isValidNumber || matchNumber === null) return

    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()

    const channel = supabase
      .channel("auth_sync_waiting")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auth_sync",
          filter: `email=eq.${normalizedEmail}`,
        },
        async (payload) => {
          const row = payload.new as { status?: string; token?: string | null }
          if (row?.status !== "verified" || !row?.token) return
          applyTokenAndRedirect(row.token, supabase)
        }
      )
      .subscribe()

    const pollInterval = setInterval(async () => {
      const result = await checkMagicLinkVerified(normalizedEmail, matchNumber)
      if (result.ok) applyTokenAndRedirect(result.token, supabase)
    }, POLL_INTERVAL_MS)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [mounted, email, isValidNumber, matchNumber, redirectToReturn])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-pulse rounded-full border-2 border-amber-500/50 border-t-amber-400" />
      </div>
    )
  }

  if (!email.trim() || !isValidNumber) {
    router.replace("/login")
    return null
  }

  return (
    <AuroraBackground className="px-4 text-white">
      <motion.div
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-[1px] shadow-[0_0_40px_rgba(0,0,0,0.8)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Card className="relative rounded-3xl border border-white/10 bg-black/60 p-8 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 shadow-[0_0_25px_rgba(248,113,22,0.5)]">
              <Image
                src="/images/streettaco-logo.svg"
                alt="Street Taco"
                width={52}
                height={52}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                StreetTaco ID
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                One account to rule them all.
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {status === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8 py-4 text-center"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400/90">
                    Match number
                  </p>
                  <motion.p
                    className="font-mono text-7xl font-bold tabular-nums tracking-tight text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.4)] sm:text-8xl"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  >
                    {matchNumber}
                  </motion.p>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {CAPTION}
                </p>
                <p className="text-xs text-zinc-500">
                  We sent an email to <span className="font-medium text-white">{email}</span>. Open the link and confirm this number.
                </p>
                <div className="flex justify-center gap-1 pt-4">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-amber-500/70"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-400/30"
                >
                  <motion.svg
                    className="h-10 w-10 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                </motion.div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold uppercase tracking-widest text-emerald-400">
                    COMPLETED
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    You&apos;re signed in
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Redirecting you to your destination…
                  </p>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 py-6 text-center"
              >
                <p className="text-sm text-red-400">
                  Something went wrong. Please try signing in again from the login page.
                </p>
                <a
                  href="/login"
                  className="inline-block text-sm font-medium text-amber-400 underline underline-offset-2 hover:text-amber-300"
                >
                  Back to login
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AuroraBackground>
  )
}
