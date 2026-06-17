"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface GlitchContainerProps {
  children: React.ReactNode;
  active?: boolean;
  frequency?: number;
  className?: string;
}

export function GlitchContainer({ children, active = false, frequency = 0.003, className }: GlitchContainerProps) {
  const [glitch, setGlitch] = useState<{ x: number; y: number; rgb: boolean; slice: boolean } | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) { setGlitch(null); return; }

    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);

      if (Math.random() < frequency) {
        setGlitch({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 2,
          rgb: Math.random() < 0.3,
          slice: Math.random() < 0.2,
        });
        setTimeout(() => setGlitch(null), 80 + Math.random() * 160);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, frequency]);

  return (
    <div
      className={cn("relative", className)}
      style={{
        transform: glitch ? `translate(${glitch.x}px, ${glitch.y}px)` : undefined,
        transition: glitch ? "none" : "transform 180ms ease, filter 240ms ease",
        filter: glitch?.rgb ? "url(#rgb-split)" : undefined,
      }}
    >
      {children}

      {glitch?.slice && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: `inset(${20 + Math.random() * 60}% 0 ${20 + Math.random() * 60}% 0)`,
            transform: `translateX(${(Math.random() - 0.5) * 6}px)`,
            opacity: 0.3,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
