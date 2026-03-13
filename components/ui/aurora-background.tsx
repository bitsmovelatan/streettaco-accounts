 "use client";

import React, { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  const auroraColors = [
    "#0F172A",
    "#1E293B",
    "#C2410C",
    "#701A75",
    "#000000",
  ];

  return (
    <main>
      <div
        className={cn(
          "relative flex h-[100vh] flex-col items-center justify-center bg-black text-slate-950 transition-bg",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className={cn(
              `
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
            [--aurora:repeating-linear-gradient(100deg,${auroraColors[0]}_10%,${auroraColors[1]}_15%,${auroraColors[2]}_20%,${auroraColors[3]}_25%,${auroraColors[4]}_30%)]
            [background-image:var(--white-gradient),var(--aurora)]
            dark:[background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,_50%_50%]
            filter blur-[10px] invert dark:invert-0
            after:content-[""] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] 
            after:dark:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:200%,_100%] 
            after:animate-aurora after:[background-attachment:fixed]
            opacity-50 will-change-transform`,
              showRadialGradient &&
                "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]",
            )}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </div>

        <div className="relative z-10 w-full max-w-md p-4">
          {children}
        </div>
      </div>
    </main>
  );
};

