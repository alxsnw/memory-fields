// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { supabase as getSupabase } from "@/lib/supabase";
import { getSavedName, saveName } from "@/lib/name-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepthWaveRings } from "@/components/hero/depth-wave-rings";
import IdleAuroraField from "@/components/visualizer/idle-aurora-field";
import { DailyListenerCount } from "@/components/metrics/daily-listener-count";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  const router = useRouter();
  const [nameDialog, setNameDialog] = useState(false);
  const [name, setName] = useState(getSavedName() || "");
  const [creating, setCreating] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  const clickTimeRef = useRef(0);

  const createRoom = async () => {
    if (!name.trim()) return;
    setCreating(true);

    try {
      const slug = uuid().slice(0, 8);
      const clientId = uuid();

      const supabase = getSupabase();
      const { data: room } = await supabase
        .from("rooms")
        .insert({ slug, title: "Untitled Field", host_client_id: clientId })
        .select()
        .single();

      if (!room) throw new Error("Failed to create room");

      const { error: stateError } = await supabase
        .from("room_state")
        .insert({ room_id: room.id, visual_seed: Math.floor(Math.random() * 9999) });

      if (stateError) throw stateError;

      await supabase.from("connected_clients").insert({
        client_id: clientId,
        room_id: room.id,
        display_name: name.trim(),
        role: "host",
      });

      saveName(name.trim());
      await new Promise(r => setTimeout(r, 1600));
      router.push(`/field/${slug}?clientId=${clientId}&name=${encodeURIComponent(name.trim())}`);
    } catch (err) {
      console.error("Create room error:", err);
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden transition-[background-color] ease-out"
      style={{
        backgroundColor: creating ? '#090A0B' : '#06070A',
        transitionDuration: creating ? '800ms' : '400ms',
      }}>
      <div
        className="absolute inset-0 pointer-events-none transition-opacity ease-out"
        style={{
          background: 'linear-gradient(to top, #07080A, #111318)',
          opacity: buttonHover && !creating ? 1 : 0,
          transitionDuration: '400ms',
        }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            opacity: creating ? 1 : 0,
            transform: 'scale(0.5)',
            transition: 'opacity 1.5s ease-out',
            animation: creating ? 'aurora-pulse 18s ease-in-out 1.5s infinite' : 'none',
          }}
        >
          <IdleAuroraField />
        </div>
      </div>
      <DepthWaveRings />

      <div
        className="fixed inset-0 z-50 pointer-events-none transition-opacity ease-out"
        style={{
          backgroundColor: '#06070A',
          opacity: creating ? 1 : 0,
          transitionDuration: '1.5s',
        }}
      />

      <div className="relative z-10 text-center max-w-lg" style={{
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 800ms ease-out',
      }}>
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone">v0.1</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-frost mb-3">
          Memory Fields
        </h1>
        <p className="text-sm text-stone font-mono uppercase tracking-[0.12em] mb-8 lowercase">
          by advanced dreams
        </p>

        <p className="text-soft/60 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
          Collaborative audio visualization rooms.
          Upload a track, share the link, and experience the sound together.
        </p>

        <div className="mb-10">
          <DailyListenerCount variant="hero" />
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="relative w-auto cursor-pointer select-none"
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
            onClick={async () => {
              const saved = getSavedName();
              if (saved) {
                setName(saved);
                setCreating(true);
                clickTimeRef.current = Date.now();
                try {
                  const slug = uuid().slice(0, 8);
                  const clientId = uuid();
                  const supabase = getSupabase();
                  const { data: room } = await supabase.from("rooms")
                    .insert({ slug, title: "Untitled Field", host_client_id: clientId })
                    .select().single();
                  if (!room) throw new Error("Failed to create room");
                  await supabase.from("room_state").insert({ room_id: room.id, visual_seed: Math.floor(Math.random() * 9999) });
                  await supabase.from("connected_clients").insert({ client_id: clientId, room_id: room.id, display_name: saved, role: "host" });
                  saveName(saved);
                  const elapsed = Date.now() - clickTimeRef.current;
                  if (elapsed < 4000) {
                    await new Promise(r => setTimeout(r, 4000 - elapsed));
                  }
                  setFadingOut(true);
                  await new Promise(r => setTimeout(r, 800));
                  router.push(`/field/${slug}?clientId=${clientId}&name=${encodeURIComponent(saved)}`);
                } catch (err) {
                  console.error(err);
                  alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
                  setCreating(false);
                }
              } else {
                setNameDialog(true);
              }
            }}
          >
            {/* Laser sweep beam */}
            <div className="absolute inset-0 overflow-hidden rounded-capsule pointer-events-none">
              <div
                className="absolute top-0 bottom-0 w-[35%] skew-x-[-18deg] blur-[8px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(120,223,255,0) 10%, rgba(120,223,255,0.18) 35%, rgba(244,246,250,0.35) 50%, rgba(167,139,250,0.20) 65%, transparent 100%)",
                  animationName: creating ? "none" : "laser-sweep",
                  animationDuration: buttonHover ? "4s" : "8s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  opacity: buttonHover && !creating ? 1 : 0.6,
                  transition: "opacity 300ms ease",
                }}
              />
            </div>

            {/* Inner top highlight */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent rounded-capsule pointer-events-none" />

            <div
              className={`
                relative min-h-[60px] min-w-[180px] px-8 py-5 flex items-center justify-center gap-2 rounded-capsule overflow-hidden
                border transition-all duration-300 pointer-events-none
                ${creating
                  ? "border-white/[0.14] bg-white/[0.06]"
                  : "border-white/[0.10] bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.985]"
                }
              `}
            >
              <span className={`transition-all duration-200 font-mono text-[11px] uppercase tracking-[0.16em] text-frost/86 ${creating ? 'opacity-0' : ''}`}>
                Create Field
              </span>
              {creating && (
                <span className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-frost/50" style={{ animation: 'dot-pulse 3s ease-in-out infinite', animationDelay: '0s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-frost/50" style={{ animation: 'dot-pulse 3s ease-in-out infinite', animationDelay: '0.5s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-frost/50" style={{ animation: 'dot-pulse 3s ease-in-out infinite', animationDelay: '1s' }} />
                </span>
              )}
            </div>
          </div>
          <p className="mt-2.5 text-[10px] font-mono uppercase tracking-[0.1em] text-subtle">
            {creating ? 'initializing field...' : 'private · persistent · shared'}
          </p>
        </div>
      </div>

      <Dialog open={nameDialog} onOpenChange={setNameDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Memory Field</DialogTitle>
            <DialogDescription>
              Choose a name to join this room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                placeholder="display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                autoFocus
              />
            </div>
            <Button className="w-full" onClick={createRoom} disabled={!name.trim() || creating}>
              {creating ? "Creating..." : "Create Field"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
