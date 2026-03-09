import { ConsentManager } from "@/components/consent/consent-manager"

export const metadata = {
  title: "Legal consent | Street Taco Accounts",
  description: "Accept Terms of Service and Privacy Policy to continue.",
}

export default function ConsentPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <ConsentManager />
    </div>
  )
}
