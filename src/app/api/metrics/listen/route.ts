import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("daily_listeners")
    .select("id", { count: "exact", head: true })
    .eq("listened_date", today);
  return NextResponse.json({ count: count ?? 0 });
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { visitor_id } = await req.json();
  if (!visitor_id || typeof visitor_id !== "string") {
    return NextResponse.json({ error: "visitor_id required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error: insertErr } = await supabase
    .from("daily_listeners")
    .upsert(
      { visitor_id, listened_date: today },
      { onConflict: "visitor_id,listened_date", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (insertErr && !insertErr.message.includes("duplicate")) {
    console.error("[metrics] insert error:", insertErr);
  }

  const { count } = await supabase
    .from("daily_listeners")
    .select("id", { count: "exact", head: true })
    .eq("listened_date", today);

  return NextResponse.json({ count: count ?? 0 });
}