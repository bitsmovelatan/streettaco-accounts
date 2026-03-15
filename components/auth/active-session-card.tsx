"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, LogOut, ArrowRight, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ActiveSessionCardProps {
  email: string;
  /** Timestamp de Supabase (segundos, Unix) */
  expiresAt: number;
  onContinue: () => void;
  onSignOut: () => void;
  isSigningOut?: boolean;
}

export function ActiveSessionCard({ email, expiresAt, onContinue, onSignOut, isSigningOut }: ActiveSessionCardProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = expiresAt - now;

      if (diff <= 0) return "Expired";

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    setTimeLeft(calculateTime());
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />

        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Session Active</CardTitle>
          <CardDescription className="text-zinc-400">You are already logged in.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-200 font-medium truncate text-sm">{email}</span>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                <Clock className="h-3 w-3" />
                Expires in
              </div>
              <span
                className={`text-sm font-mono ${timeLeft === "Expired" ? "text-rose-400" : "text-emerald-400"}`}
              >
                {timeLeft}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button onClick={onContinue} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white group">
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>

          <Button
            variant="ghost"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="w-full text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
