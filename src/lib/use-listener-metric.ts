"use client";

import { useState, useCallback, useRef, useEffect } from "react";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("mf_visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mf_visitor_id", id);
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[metrics] created visitorId:", id);
    }
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
  const val = localStorage.getItem(key);
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[metrics] daily flag", key, "=", val);
  }
  return val === "1";
}

function markListenedToday(): void {
  if (typeof window === "undefined") return;
  const key = `mf_listened_${todayStr()}`;
  localStorage.setItem(key, "1");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[metrics] set daily flag:", key);
  }
}

export function useListenerMetric() {
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const registering = useRef(false);

  // Fetch count on mount (GET)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const visitorId = getVisitorId();
    if (process.env.NODE_ENV === "development") {
      console.log("[metrics] mount — visitorId:", visitorId, "alreadyListened:", alreadyListenedToday());
    }
    fetch("/api/metrics/listen")
      .then((r) => r.json())
      .then((data) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[metrics] GET response:", data);
        }
        setTodayCount(data.count ?? 0);
      })
      .catch((e) => {
        console.error("[metrics] GET failed:", e);
      });
  }, []);

  const registerListen = useCallback(async () => {
    if (registering.current || alreadyListenedToday()) {
      if (process.env.NODE_ENV === "development") {
        console.log("[metrics] skip register — alreadyListened:", alreadyListenedToday(), "registering:", registering.current);
      }
      return;
    }
    registering.current = true;

    try {
      const visitorId = getVisitorId();
      if (!visitorId) return;

      if (process.env.NODE_ENV === "development") {
        console.log("[metrics] POST — visitorId:", visitorId);
      }

      const res = await fetch("/api/metrics/listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: visitorId }),
      });

      const data = await res.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[metrics] POST response:", { status: res.status, data });
      }

      if (res.ok) {
        setTodayCount(data.count ?? 0);
        if (data.isNew) {
          markListenedToday();
          if (process.env.NODE_ENV === "development") {
            console.log("[metrics] registered, count:", data.count);
          }
        } else {
          // Already registered today — set local flag anyway so we skip future POSTs
          markListenedToday();
          if (process.env.NODE_ENV === "development") {
            console.log("[metrics] already registered today, count:", data.count);
          }
        }
      } else {
        console.error("[metrics] POST error:", data.error);
      }
    } catch (e) {
      console.error("[metrics] register failed:", e);
    } finally {
      registering.current = false;
    }
  }, []);

  return { todayCount, registerListen };
}
