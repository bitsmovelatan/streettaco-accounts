/** Default redirect when no return_to is provided (Street Taco Plus). */
export const DEFAULT_RETURN_URL = "https://plus.streettaco.com.au"

/**
 * Shared cookie config for .streettaco.com.au (IdP + SP session).
 * Apply domain only in production (use isProduction()) so localhost works in development.
 */
export const SHARED_COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/",
  sameSite: "lax" as const,
  secure: true,
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}
