"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"

/**
 * Session is handled only by Server Components and Route Handlers (cookies).
 * This provider is a no-op; no onAuthStateChange or client-side session state.
 */
type AuthContextValue = {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  clearUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        refresh: async () => {},
        clearUser: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
