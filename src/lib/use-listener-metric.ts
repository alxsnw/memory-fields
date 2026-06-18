"use client";

import { useState, useCallback, useRef } from "react";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("mf_visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mf_visitor_id", id);
  }
  return id;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function alreadyListenedToday(): boolean {
  if (typeof window === "undefined") return false;
  const key = `mf_listened_${todayStr()}`;
  return localStorage.getItem(key) === "1";
}

function markListenedToday(): void {
  if (typeof window === "undefined") return;
  const key = `mf_listened_${todayStr()}`;
  localStorage.setItem(key, "1");
}

export function useListenerMetric() {
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const registering = useRef(false);

  const registerListen = useCallback(async () => {
    if (registering.current || alreadyListenedToday()) return;
    registering.current = true;

    try {
      const visitorId = getVisitorId();
      if (!visitorId) return;

      const res = await fetch("/api/metrics/listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: visitorId }),
      });

      if (res.ok) {
        const data = await res.json();
        setTodayCount(data.count ?? 0);
        markListenedToday();
      }
    } catch (e) {
      console.error("[metric] register failed:", e);
    } finally {
      registering.current = false;
    }
  }, []);

  return { todayCount, registerListen };
}
