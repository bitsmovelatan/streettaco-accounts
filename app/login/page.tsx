"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { DEFAULT_RETURN_URL } from "@/lib/constants"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { Card } from "@/components/ui/card"

type Step = "form" | "magic-sent"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState<"checking" | "google" | "magic" | null>("checking")
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = mounted ? (searchParams.get("return_to") ?? DEFAULT_RETURN_URL) : DEFAULT_RETURN_URL

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const params = new URLSearchParams()
        if (returnTo) params.set("return_to", returnTo)
        router.replace(`/?${params.toString()}`)
      } else {
        setLoading(null)
      }
    })
  }, [mounted, router, returnTo])

  async function handleGoogleSignIn() {
    if (typeof window === "undefined") return
    setError(null)
    setLoading("google")
    const supabase = createClient()
    const redirectTo = new URL("/auth/callback", window.location.origin)
    if (returnTo) redirectTo.searchParams.set("return_to", returnTo)
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
      },
    })
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please enter a valid email.")
      return
    }
    if (typeof window === "undefined") return
    setError(null)
    setLoading("magic")
    const supabase = createClient()
    const redirectTo = new URL("/auth/callback", window.location.origin)
    if (returnTo) redirectTo.searchParams.set("return_to", returnTo)
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo.toString(),
      },
    })
    setLoading(null)
    if (magicError) {
      setError(magicError.message)
      return
    }
    setStep("magic-sent")
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="mt-8 w-full max-w-md">
          <Skeleton className="mb-2 h-1 w-full rounded-full" />
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  const isLoading = loading !== null

  return (
    <AuroraBackground className="px-4 text-white">
      <motion.div
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-[1px] shadow-[0_0_40px_rgba(0,0,0,0.8)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute left-0 top-0 h-0.5 w-full overflow-hidden rounded-t-3xl bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="h-full w-1/3 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
                initial={{ x: "-100%" }}
                animate={{ x: ["-100%", "150%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="relative rounded-3xl border border-white/10 bg-black/60 p-8 text-white shadow-2xl backdrop-blur-xl">
          {/* Logo + heading */}
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <motion.div
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 shadow-[0_0_25px_rgba(248,113,22,0.5)]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Image
                src="/images/streettaco-logo.svg"
                alt="Street Taco"
                width={52}
                height={52}
                className="object-contain"
                priority
              />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                StreetTaco ID
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                One account to rule them all. Access Plus, Admin, and more.
              </p>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleMagicLink} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400"
                    >
                      Work email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your professional email..."
                      autoComplete="email"
                      className="border-white/20 bg-black/40 text-sm text-white placeholder:text-zinc-500 focus-visible:border-amber-500 focus-visible:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-10 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-sm font-semibold text-black shadow-[0_0_25px_rgba(248,113,22,0.6)] transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      asChild={false}
                    >
                      <motion.span
                        className="flex items-center justify-center gap-2"
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading === "magic" ? "Sending magic link..." : "Send magic link"}
                      </motion.span>
                    </Button>
                    <p className="text-xs text-zinc-500">
                      We will never share your email. Used only to secure your StreetTaco ID.
                    </p>
                  </div>
                </form>

                {/* Separator */}
                <div className="mt-6 flex items-center gap-3 text-xs text-zinc-500">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span>or continue with</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                {/* Google button */}
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={handleGoogleSignIn}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/70 bg-white text-sm font-semibold text-black shadow-sm transition-all hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <motion.span whileTap={{ scale: 0.98 }} className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-600" />
                      <span>Continue with Google</span>
                    </motion.span>
                  </Button>
                </div>

                {error && (
                  <p className="mt-4 text-sm text-red-400" role="alert">
                    {error}
                  </p>
                )}
              </motion.div>
            )}

            {step === "magic-sent" && (
              <motion.div
                key="magic-sent"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-sm text-zinc-300"
              >
                <h2 className="text-lg font-semibold text-white">Magical link sent ✨</h2>
                <p>
                  Please check your inbox at <span className="font-medium text-white">{email}</span>.
                  Follow the link in the email to continue your session securely.
                </p>
                <p className="text-xs text-zinc-500">
                  If you do not see the email, check your spam folder or try again with a different
                  address.
                </p>
                <Button
                  type="button"
                  onClick={() => setStep("form")}
                  className="mt-2 h-9 rounded-xl border border-white/20 bg-transparent text-xs font-semibold text-zinc-200 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Use a different email
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AuroraBackground>
  )
}
