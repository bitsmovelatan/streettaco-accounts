/**
 * Default redirect when no return_to is provided (Street Taco Plus).
 * return_to is never fixed: any subdomain *.streettaco.com.au is allowed (see isTrustedReturnUrl).
 */
export const DEFAULT_RETURN_URL = "https://plus.streettaco.com.au"

/** Cookie key shared across all subdomains so plus/accounts read the same session. */
export const AUTH_STORAGE_KEY = "streettaco-auth-session"

/**
 * Master cookie options for IdP session on .streettaco.com.au.
 * Use isProduction() to set domain only in production (localhost in development).
 */
export const SHARED_COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/" as const,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}
