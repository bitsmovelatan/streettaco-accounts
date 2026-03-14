import { CloserSignOut } from "./CloserSignOut"

export const metadata = {
  title: "Close this tab | Street Taco Accounts",
}

/**
 * Shown on the device that clicked the number (validator). Message is server-rendered so it appears
 * immediately on mobile; CloserSignOut runs in client to clear the session.
 */
export default function ActionsCloserPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <p className="text-center text-sm text-zinc-600">
        You can close this tab. Sign-in will complete on your other device.
      </p>
      <CloserSignOut />
    </div>
  )
}
