"use client";

import { motion } from "framer-motion";
import { ShieldCheck, LogOut, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** Format session expiry as "Expires in X minutes" or "Expires in X hours" or "Expired" */
function formatExpiresIn(expiresAtUnixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = expiresAtUnixSeconds - now;
  if (diff <= 0) return "Expired";
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `Expires in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  return `Expires in ${hours} hour${hours !== 1 ? "s" : ""}`;
}

interface ActiveSessionCardProps {
  email: string;
  /** Unix timestamp (seconds) when the session expires */
  expiresAt?: number;
  onContinue: () => void;
  onSignOut: () => void;
  isSigningOut?: boolean;
}

export function ActiveSessionCard({ email, expiresAt, onContinue, onSignOut, isSigningOut }: ActiveSessionCardProps) {
  const expiresText = expiresAt != null ? formatExpiresIn(expiresAt) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        {/* Glassmorphism accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />

        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_24px_rgba(52,211,153,0.25)]">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            You already have an active session
          </CardTitle>
          <CardDescription className="text-zinc-400 text-base">
            You are already logged in to StreetTaco.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-white/5 border border-white/10 p-4 flex items-center gap-4">
            <div className="bg-zinc-800 rounded-full p-2">
              <User className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Account</span>
              <span className="text-zinc-200 font-medium truncate">{email}</span>
              {expiresText && (
                <span className="text-xs text-zinc-400 mt-1">{expiresText}</span>
              )}
            </div>
          </div>

          <p className="text-sm text-center text-zinc-500 leading-relaxed italic">
            Would you like to continue to the dashboard or use a different account?
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button
            onClick={onContinue}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11 transition-all group"
          >
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>

          <Button
            variant="ghost"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="w-full text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isSigningOut ? "Signing out…" : "Sign out and use another account"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
