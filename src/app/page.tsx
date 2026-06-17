// @ts-nocheck
"use client";

import { useState } from "react";
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

export const dynamic = "force-dynamic";

export default function LandingPage() {
  const router = useRouter();
  const [nameDialog, setNameDialog] = useState(false);
  const [name, setName] = useState(getSavedName() || "");
  const [creating, setCreating] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);

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
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ transform: 'scale(0.5)' }}
      >
        <div
          className="w-full h-full"
          style={{
            opacity: creating ? 1 : 0,
            transition: 'opacity 1.5s ease-out',
            animation: creating ? 'aurora-pulse 18s ease-in-out 1.5s infinite' : 'none',
          }}
        >
          <IdleAuroraField />
        </div>
      </div>
      <DepthWaveRings />

      <div className="relative z-10 text-center max-w-lg">
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone">v0.1</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-frost mb-3" style={{
          opacity: creating ? 1 : 0,
          transform: creating ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        }}>
          Memory Fields
        </h1>
        <p className="text-sm text-stone font-mono uppercase tracking-[0.12em] mb-8 lowercase" style={{
          opacity: creating ? 1 : 0,
          transform: creating ? 'translateY(0)' : 'translateY(15px)',
          transition: 'opacity 300ms ease-out, transform 300ms ease-out',
        }}>
          by advanced dreams
        </p>

        <p className="text-soft/60 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
          Collaborative audio visualization rooms.
          Upload a track, share the link, and experience the sound together.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="relative !bg-[#07080A] border border-white/[0.04] rounded-full !h-auto px-5 py-2.5 !text-white !font-normal tracking-normal transition-[border-color,background,color,padding] duration-[400ms] ease-out hover:bg-white/[0.04] hover:!text-white hover:!px-6 hover:!py-3 active:bg-white/[0.055] active:border-white/[0.22] active:!translate-y-[0.5px]"
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
            onClick={async () => {
              const saved = getSavedName();
              if (saved) {
                setName(saved);
                // Need to use the saved value directly since setState is async
                setCreating(true);
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
                  await new Promise(r => setTimeout(r, 1600));
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
            <span className={`transition-all duration-200 ${creating ? 'opacity-0 translate-y-1' : ''}`}>
              Create Field
            </span>
            {creating && (
              <span className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-frost/50" style={{ animation: 'dot-pulse 3s ease-in-out infinite', animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-frost/50" style={{ animation: 'dot-pulse 3s ease-in-out infinite', animationDelay: '0.5s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-frost/50" style={{ animation: 'dot-pulse 3s ease-in-out infinite', animationDelay: '1s' }} />
              </span>
            )}
          </Button>
          <p className="mt-2.5 text-[10px] font-mono uppercase tracking-[0.1em] text-subtle">
            private · persistent · shared
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
