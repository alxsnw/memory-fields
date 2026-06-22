"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const registering = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/metrics/listen")
      .then((r) => r.json())
      .then((data) => setTotalCount(data.total ?? 0))
      .catch(() => {});
  }, []);

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

      const data = await res.json();

      if (res.ok) {
        setTotalCount(data.total ?? 0);
        markListenedToday();
      } else {
        console.error("[metrics] POST error:", data.error);
      }
    } catch (e) {
      console.error("[metrics] register failed:", e);
    } finally {
      registering.current = false;
    }
  }, []);

  return { totalCount, registerListen };
}
