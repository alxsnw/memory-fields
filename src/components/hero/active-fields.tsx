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
    <div className="mt-10 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-brass/70 animate-pulse" />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
          Active Fields
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rooms.map((room) => (
          <button
            key={room.slug}
            onClick={() => joinRoom(room.slug)}
            className="group flex items-center justify-between w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-frost/80 truncate group-hover:text-frost transition-colors">
                {room.title}
              </div>
              <div className="text-[9px] font-mono text-stone mt-0.5 truncate">
                {room.names.join(", ")}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <span className="text-[11px] font-mono text-subtle">{room.listenerCount}</span>
              {room.isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full bg-success/60" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
