"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AtlasScanProps {
  active: boolean;
  seed?: number;
}

const LABELS = [
  { x: 4, y: 5, text: "TRACE_057" },
  { x: 78, y: 5, text: "NODE_A3" },
  { x: 4, y: 86, text: "SEED_91C7" },
  { x: 78, y: 86, text: "ARTIFACT_02" },
  { x: 38, y: 92, text: "FIELD_ROUTE_4X" },
  { x: 55, y: 3, text: "SIGNAL_CARTOGRAPHY" },
];

const TARGETS = [
  { x: 6, y: 7, size: 24 },
  { x: 80, y: 7, size: 20 },
  { x: 6, y: 74, size: 22 },
  { x: 80, y: 74, size: 26 },
];

const DATA_POINTS = 16;

export default function AtlasScan({ active, seed = 0 }: AtlasScanProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[5] font-mono">
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]">
        <defs>
          <pattern id="atlas-grid" width={64} height={64} patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#F4F6FA" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#atlas-grid)" />
      </svg>

      {/* Telemetry labels */}
      {LABELS.map((l) => (
        <div
          key={l.text}
          className="absolute text-[8px] uppercase tracking-[0.12em] text-frost/20"
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
        >
          {l.text}
        </div>
      ))}

      {/* Corner targets */}
      {TARGETS.map((t, i) => (
        <div
          key={i}
          className="absolute w-6 h-6"
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
        >
          {/* Corner brackets */}
          <svg viewBox="0 0 24 24" className="w-full h-full opacity-[0.2]">
            <path d="M2 2h6M2 2v6M22 2h-6M22 2v6M2 22h6M2 22v-6M22 22h-6M22 22v-6"
              fill="none" stroke="#F4F6FA" strokeWidth="0.6" />
          </svg>
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[2px] rounded-full bg-frost/20" />
        </div>
      ))}

      {/* Data points with connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
        {Array.from({ length: DATA_POINTS }).map((_, i) => {
          const angle = (i / DATA_POINTS) * Math.PI * 2;
          const r = 18 + Math.sin(tick * 0.5 + i) * 4;
          const cx = 50 + Math.cos(angle) * r;
          const cy = 50 + Math.sin(angle) * r;
          const nextIdx = (i + 1) % DATA_POINTS;
          const nextAngle = (nextIdx / DATA_POINTS) * Math.PI * 2;
          const nextR = 18 + Math.sin(tick * 0.5 + nextIdx) * 4;
          const nextCx = 50 + Math.cos(nextAngle) * nextR;
          const nextCy = 50 + Math.sin(nextAngle) * nextR;
          return (
            <g key={i}>
              <line x1={`${cx}%`} y1={`${cy}%`} x2={`${nextCx}%`} y2={`${nextCy}%`}
                stroke="#78DFFF" strokeWidth="0.3" />
              <circle cx={`${cx}%`} cy={`${cy}%`} r="1.5" fill="#F4F6FA" opacity="0.3" />
            </g>
          );
        })}
      </svg>

      {/* Center connection hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[1px]">
        <div className="absolute inset-[-16px] rounded-full border border-frost/8" />
        <div className="absolute inset-[-32px] rounded-full border border-frost/5" />
      </div>
    </div>
  );
}
