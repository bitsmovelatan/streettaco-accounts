import { z } from "zod"

/** Matches streettaco.com.au and any subdomain (e.g. plus.streettaco.com.au). */
const TRUSTED_HOST_REGEX = /^(.*?\.)?streettaco\.com\.au$/

/**
 * Returns true if the URL is a trusted redirect target. Safe to use on client and server.
 * In production: https + streettaco.com.au or *.streettaco.com.au.
 * In development (NODE_ENV or localhost): allow http and localhost.
 */
export function isTrustedReturnUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    const isProd =
      typeof process !== "undefined" && process.env?.NODE_ENV === "production"
    const trustedHost =
      TRUSTED_HOST_REGEX.test(host) ||
      (!isProd && (host === "localhost" || host.endsWith(".localhost")))
    const okProtocol =
      u.protocol === "https:" ||
      (!isProd && u.protocol === "http:")
    return trustedHost && okProtocol
  } catch {
    return false
  }
}

/**
 * Validates that a URL is a trusted subdomain of streettaco.com.au (or the root domain).
 * Used for return_to / next redirect targets to prevent open redirects.
 */
export const trustedReturnUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const u = new URL(url)
        const host = u.hostname.toLowerCase()
        const isProduction = process.env.NODE_ENV === "production"
        const trustedHost =
          TRUSTED_HOST_REGEX.test(host) ||
          (!isProduction && (host === "localhost" || host.endsWith(".localhost")))
        const okProtocol =
          u.protocol === "https:" || (!isProduction && u.protocol === "http:")
        return trustedHost && okProtocol
      } catch {
        return false
      }
    },
    { message: "return_to must be a trusted Street Taco subdomain (e.g. plus.streettaco.com.au)" }
  )

export type TrustedReturnUrl = z.infer<typeof trustedReturnUrlSchema>

/** Email for magic link (normalized). */
export const emailSchema = z
  .string()
  .min(1, "Please enter your email.")
  .email("Please enter a valid email address.")
  .transform((s) => s.trim().toLowerCase())

/** Safe parse and return first error message or the value. */
export function parseReturnTo(value: string | null): { ok: true; url: string } | { ok: false; error: string } {
  if (!value?.trim()) {
    return { ok: false, error: "Missing return_to" }
  }
  const result = trustedReturnUrlSchema.safeParse(value.trim())
  if (result.success) return { ok: true, url: result.data }
  const firstIssue = result.error.issues?.[0]
  return { ok: false, error: firstIssue?.message ?? "Invalid return_to" }
}

export function parseEmail(value: string): { ok: true; email: string } | { ok: false; error: string } {
  const result = emailSchema.safeParse(value)
  if (result.success) return { ok: true, email: result.data }
  const firstIssue = result.error.issues?.[0]
  return { ok: false, error: firstIssue?.message ?? "Invalid email" }
}
