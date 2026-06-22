import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ total: 0 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  // Lifetime total — count all rows
  const { count, error } = await supabase
    .from("daily_listeners")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("[metrics] GET error:", error.message);
    return NextResponse.json({ total: 0 });
  }
  return NextResponse.json({ total: count ?? 0 });
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ total: 0, isNew: false, error: "Supabase env missing" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { visitor_id } = await req.json();
  if (!visitor_id || typeof visitor_id !== "string") {
    return NextResponse.json({ total: 0, isNew: false, error: "visitor_id required" }, { status: 400 });
  }

  const today = todayStr();

  const { data: insertData, error: insertErr } = await supabase
    .from("daily_listeners")
    .upsert(
      { visitor_id, listened_date: today },
      { onConflict: "visitor_id,listened_date", ignoreDuplicates: true }
    )
    .select();

  if (insertErr) {
    console.error("[metrics] POST insert error:", insertErr.message);
    return NextResponse.json({ total: 0, isNew: false, error: insertErr.message }, { status: 500 });
  }

  // Return lifetime total
  const { count, error: countErr } = await supabase
    .from("daily_listeners")
    .select("id", { count: "exact", head: true });

  if (countErr) {
    console.error("[metrics] POST count error:", countErr.message);
    return NextResponse.json({ total: 0, isNew: false, error: countErr.message }, { status: 500 });
  }

  const isNew = insertData && insertData.length > 0;
  return NextResponse.json({ total: count ?? 0, isNew });
}
