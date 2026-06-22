"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedName } from "@/lib/name-store";
import { v4 as uuid } from "uuid";
import { supabase as getSupabase } from "@/lib/supabase";

interface ActiveRoom {
  slug: string;
  title: string;
  listenerCount: number;
  names: string[];
  isPlaying: boolean;
  visualModel: string;
  createdAt: string;
}

export function ActiveFields() {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/rooms/active")
      .then((r) => r.json())
      .then((data) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function joinRoom(slug: string) {
    const name = getSavedName();
    if (!name) return;
    const clientId = uuid();
    const supabase = getSupabase();
    await supabase.from("connected_clients").upsert(
      { client_id: clientId, display_name: name, role: "listener", last_seen_at: new Date().toISOString() },
      { onConflict: "client_id" },
    );
    router.push(`/field/${slug}?clientId=${clientId}&name=${encodeURIComponent(name)}`);
  }

  if (loading || rooms.length === 0) return null;

  return (
    <div className="mt-12 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-brass/70 animate-pulse" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
          Fields Open Now
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {rooms.map((room) => (
          <div
            key={room.slug}
            className="group flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brass/40 shrink-0" />
                <span className="text-[13px] font-medium text-frost/80 truncate">
                  {room.title}
                </span>
              </div>
              <div className="text-[10px] font-mono text-stone mt-0.5 ml-[14px]">
                {room.listenerCount} {room.listenerCount === 1 ? "listener" : "listeners"} inside
              </div>
            </div>
            <button
              onClick={() => joinRoom(room.slug)}
              className="ml-3 shrink-0 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-[0.08em] text-frost/60 border border-white/[0.10] hover:bg-white/[0.06] hover:border-white/[0.18] hover:text-frost transition-all duration-200 active:scale-[0.97]"
            >
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
