import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

  const { data: rooms, error: roomsError } = await supabase.from("rooms").select("id, slug").limit(1);
  const { data: tracksSelect, error: tracksSelectError } = await supabase.from("tracks").select("id").limit(1);
  const { data: roomStateSelect, error: roomStateError } = await supabase.from("room_state").select("room_id").limit(1);
  const { data: clientsSelect, error: clientsError } = await supabase.from("connected_clients").select("client_id").limit(1);

  let insertResult: Record<string, unknown> = {};
  if (rooms && rooms.length > 0) {
    const { data: upsertData, error: upsertError } = await supabase.from("room_state").upsert(
      { room_id: rooms[0].id, visual_seed: 9999 },
      { onConflict: "room_id" },
    ).select().single();
    insertResult = {
      upserted: upsertData ? "ok" : "no data",
      upsertError: upsertError?.message || null,
    };
  }

  return NextResponse.json({
    rooms: rooms ? "ok" : roomsError?.message,
    tracks: tracksSelect ? "ok" : tracksSelectError?.message,
    roomState: roomStateSelect ? "ok" : roomStateError?.message,
    connectedClients: clientsSelect ? "ok" : clientsError?.message,
    upsertTest: insertResult,
  });
}
