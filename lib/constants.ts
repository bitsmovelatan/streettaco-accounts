/** Default redirect when no return_to is provided (Street Taco Plus). */
export const DEFAULT_RETURN_URL = "https://plus.streettaco.com.au"

/** Shared cookie config for .streettaco.com.au so session works across subdomains. */
export const SHARED_COOKIE_OPTIONS = {
  domain: ".streettaco.com.au" as const,
  path: "/",
  sameSite: "lax" as const,
  secure: true,
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}
