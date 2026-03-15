"use client";

import { motion } from "framer-motion";

export function CatrinaBackground({
  opacity = 0.1,
  blur = "2px",
}: { opacity?: number; blur?: string }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 bg-no-repeat bg-center bg-cover"
        style={{
          backgroundImage: "url('/catrina-bg.svg')",
          filter: `blur(${blur})`,
        }}
      />
      {/* Overlay gradiente para asegurar legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
    </div>
  );
}
