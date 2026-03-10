import { cn } from "@/lib/utils"

/**
 * Neutral placeholder that matches server first paint to avoid hydration mismatch.
 * Use when rendering user/session-dependent content only after mounted.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      data-skeleton
      {...props}
    />
  )
}

export { Skeleton }
