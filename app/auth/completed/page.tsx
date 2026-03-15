"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";

export default function AuthCompletedPage() {
  // Opcional: Cerrar la pestaña automáticamente después de 5 segundos
  // (Solo funciona si la pestaña fue abierta por un script, pero es un buen detalle)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Ya puedes cerrar esta pestaña.");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 flex flex-col items-center justify-center px-4 text-center"
      >
        <div className="relative mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2,
            }}
          >
            <CheckCircle2 className="w-24 h-24 text-emerald-500" />
          </motion.div>

          {/* Efecto de pulso detrás del check */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"
          />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
          Identity Verified
        </h1>

        <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
          Great! You've successfully confirmed your identity.
          <span className="block mt-2 font-medium text-emerald-400">
            Check your other screen to continue.
          </span>
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-sm text-zinc-500 italic"
        >
          You can safely close this browser tab now.
        </motion.div>
      </motion.div>
    </AuroraBackground>
  );
}
