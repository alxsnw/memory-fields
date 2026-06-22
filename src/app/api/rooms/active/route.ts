import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ rooms: [] });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Get rooms with recently active clients
  const { data: clients, error: clientsError } = await supabase
    .from("connected_clients")
    .select("room_id, display_name, role, last_seen_at")
    .gte("last_seen_at", oneHourAgo);

  if (clientsError) {
    console.error("[active-rooms] clients error:", clientsError.message);
    return NextResponse.json({ rooms: [] });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ rooms: [] });
  }

  // Group by room_id
  const roomMap = new Map<string, { names: string[]; listenerCount: number }>();
  for (const c of clients) {
    if (!roomMap.has(c.room_id)) {
      roomMap.set(c.room_id, { names: [], listenerCount: 0 });
    }
    const entry = roomMap.get(c.room_id)!;
    entry.names.push(c.display_name);
    entry.listenerCount++;
  }

  const roomIds = [...roomMap.keys()];

  // Fetch room details
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, slug, title, created_at")
    .in("id", roomIds);

  if (roomsError) {
    console.error("[active-rooms] rooms error:", roomsError.message);
    return NextResponse.json({ rooms: [] });
  }

  // Fetch room_state for each room
  const { data: states } = await supabase
    .from("room_state")
    .select("room_id, is_playing, current_track_id, visual_model")
    .in("room_id", roomIds);

  const stateMap = new Map((states || []).map((s) => [s.room_id, s]));

  // Combine and sort
  const active = (rooms || [])
    .map((r) => {
      const entry = roomMap.get(r.id)!;
      const state = stateMap.get(r.id);
      return {
        slug: r.slug,
        title: r.title,
        listenerCount: entry.listenerCount,
        names: entry.names.slice(0, 3),
        isPlaying: state?.is_playing ?? false,
        visualModel: state?.visual_model ?? "signal-field",
        createdAt: r.created_at,
      };
    })
    .sort((a, b) => b.listenerCount - a.listenerCount)
    .slice(0, 10);

  return NextResponse.json({ rooms: active });
}
