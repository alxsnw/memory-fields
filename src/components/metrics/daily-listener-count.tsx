"use client";

import { useEffect, useState } from "react";

interface Props {
  count?: number | null;
  variant?: "subtle" | "hero";
}

export function DailyListenerCount({ count: propCount, variant = "subtle" }: Props) {
  const [localCount, setLocalCount] = useState<number | null>(propCount ?? null);

  useEffect(() => {
    if (propCount !== undefined) return;
    fetch("/api/metrics/listen")
      .then((r) => r.json())
      .then((data) => setLocalCount(data.total ?? 0))
      .catch(() => {});
  }, [propCount]);

  const count = propCount ?? localCount;
  if (count === null) return null;

  if (variant === "hero") {
    return (
      <div className="flex flex-col items-center gap-1 select-none">
        <span className="font-mono text-[32px] font-light tracking-tight text-frost/80">
          {count}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone">
          {count === 1 ? "listener has" : "listeners have"} entered the field
        </span>
      </div>
    );
  }

  return (
    <div className="font-mono text-[10px] text-subtle/50 tracking-[0.05em] select-none">
      {count} {count === 1 ? "listener has" : "listeners have"} entered the field
    </div>
  );
}
