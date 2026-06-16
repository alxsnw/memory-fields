import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

  const { data: rooms, error: roomsError } = await supabase.from("rooms").select("id, slug").limit(1);
  const { data: tracksSelect, error: tracksSelectError } = await supabase.from("tracks").select("id").limit(1);

  let insertResult: Record<string, unknown> = {};
  if (rooms && rooms.length > 0) {
    const { data: insertData, error: insertError } = await supabase.from("tracks").insert({
      room_id: rooms[0].id,
      original_filename: "debug-test.mp3",
      display_name: "debug test",
      file_url: "https://example.com/test.mp3",
      file_size: 1000,
      mime_type: "audio/mpeg",
      uploaded_by_display_name: "debug",
      status: "ready",
    }).select().single();
    insertResult = {
      inserted: insertData ? "ok" : "no data",
      insertError: insertError?.message || null,
    };
  }

  return NextResponse.json({
    roomsQuery: rooms ? "ok" : roomsError?.message,
    tracksSelect: tracksSelect ? "ok" : tracksSelectError?.message,
    tracksSelectError: tracksSelectError?.message,
    insertResult,
  });
}
