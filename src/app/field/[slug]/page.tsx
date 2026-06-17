// @ts-nocheck
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { v4 as uuid } from "uuid";
import { supabase as getSupabase } from "@/lib/supabase";
import { getSavedName, saveName } from "@/lib/name-store";
import { cn } from "@/lib/utils";
import type { Room, Track, RoomState, ConnectedClient, SyncStatus, VisualModel, PaletteMode, VisualParams } from "@/types";
import type { JourneyState, InterpolatedState } from "@/lib/visual-journey";
import { createJourney, tickJourney, getInterpolatedState, updateJourneyPlayState, visibilityCompensation, estimateBrightness } from "@/lib/visual-journey";
import { getPreset, pickCompatibleNext } from "@/lib/presets";
import { LatentFieldEngine } from "@/lib/latent-field";
import { VisualizerDebug } from "@/components/debug/visualizer-debug";

import Brand from "@/components/sidebar/brand";
import UploadCapsule from "@/components/sidebar/upload-capsule";
import NowPlaying from "@/components/sidebar/now-playing";
import { MemoryArchive } from "@/components/archive/memory-archive";
import { TransportBar } from "@/components/transport/transport-bar";
import { CanvasVisualizer } from "@/components/visualizer/canvas-visualizer";
import AtlasScan from "@/components/visualizer/atlas-scan";
import IdleAuroraField from "@/components/visualizer/idle-aurora-field";
import { GlitchContainer } from "@/components/ui/glitch-container";
import { FieldControls } from "@/components/sidebar/field-controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function getClient() {
  return getSupabase();
}

function getRoomSeed(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function FieldPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);

  const [clientId, setClientId] = useState(searchParams.get("clientId") || uuid());
  const [displayName, setDisplayName] = useState(searchParams.get("name") || getSavedName() || "");
  const [showNameDialog, setShowNameDialog] = useState(!searchParams.get("name"));
  const [nameInput, setNameInput] = useState(displayName);

  const [isHost, setIsHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showBypass, setShowBypass] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showAtlasScan, setShowAtlasScan] = useState(false);
  const [glitchEnabled, setGlitchEnabled] = useState(false);
  const [visibilityBoost, setVisibilityBoost] = useState(true);
  const visibilityBoostRef = useRef(true);
  visibilityBoostRef.current = visibilityBoost;
  const visualParamsRef = useRef<VisualParams>(undefined as unknown as VisualParams);
  const [compActive, setCompActive] = useState(false);
  const [archivedTrackIds, setArchivedTrackIds] = useState<Set<string>>(new Set());

  const handleArchive = useCallback((track: Track) => {
    setArchivedTrackIds((prev) => {
      const next = new Set(prev);
      next.add(track.id);
      return next;
    });
  }, []);

  // Latent field
  const [latentState, setLatentState] = useState<"dormant" | "active" | "absorbed">("dormant");
  const latentStateRef = useRef(latentState);
  latentStateRef.current = latentState;
  const latentRef = useRef<LatentFieldEngine | null>(null);

  const handleWakeField = useCallback(() => {
    if (latentRef.current?.isActive) return;
    const engine = new LatentFieldEngine();
    engine.wake();
    latentRef.current = engine;
    setLatentState("active");
  }, []);

  // Field Controls handlers
  const handleModelChange = useCallback((model: VisualModel) => {
    if (!isHost || !room) return;
    syncState({ visual_model: model });
  }, [isHost, room]);

  const handlePaletteChange = useCallback((mode: PaletteMode) => {
    if (!isHost || !room) return;
    syncState({ palette_mode: mode });
  }, [isHost, room]);

  const handleParamChange = useCallback((params: Partial<VisualParams>) => {
    if (!isHost || !room || !roomState) return;
    const merged = { ...roomState.visual_params, ...params };
    syncState({ visual_params: merged });
  }, [isHost, room, roomState]);

  const handleMutate = useCallback(() => {
    if (!isHost || !room) return;
    syncState({ visual_seed: Math.floor(Math.random() * 9999) });
  }, [isHost, room]);

  // Tune mode (dev only)
  const [tuneMode, setTuneMode] = useState(false);

  // Journey controls
  const handleNextPreset = useCallback(() => {
    setJourney((prev) => {
      const next = pickCompatibleNext(prev.targetPreset, prev.roomSeed + 1);
      return {
        ...prev,
        startPreset: prev.targetPreset,
        targetPreset: next,
        startTime: Date.now(),
        transitionDuration: 300000,
        progress: 0,
        phase: "transitioning",
      };
    });
  }, []);

  const handleJumpTo = useCallback((target: number) => {
    setJourney((prev) => ({
      ...prev,
      startTime: Date.now() - (prev.transitionDuration * target / 100),
      phase: "transitioning",
    }));
  }, []);

  const handleCompleteTransition = useCallback(() => {
    setJourney((prev) => ({
      ...prev,
      startTime: 0,
      transitionDuration: 1,
      progress: 1,
      phase: "transitioning",
    }));
  }, []);

  const handleSetDuration = useCallback((ms: number) => {
    setJourney((prev) => ({
      ...prev,
      startTime: Date.now(),
      transitionDuration: ms,
      phase: "transitioning",
    }));
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const roomSeed = useRef(getRoomSeed(slug));
  const [journey, setJourney] = useState(() => createJourney(roomSeed.current, false));
  const [interpolatedState, setInterpolatedState] = useState<InterpolatedState>(() => {
    const raw = getInterpolatedState(journey);
    const comp = visibilityCompensation(raw, false);
    return comp.state;
  });

  const isDev = searchParams.get("dev") === "true";

  const defaultVisualParams: VisualParams = {
    intensity: 0.5, density: 0.5, speed: 0.5, memory: 0.5, detail: 0.5,
    glow: 0.4, randomness: 0.3, smoothing: true, smoothingAmount: 0.3,
    coreSize: 0.5, expansion: 0.5, edgeReactivity: 0.5, centerBias: 0.5,
    bloom: 0.3, grain: 0, grainIntensity: 0.5, grainSize: 0.5,
    chromatic: 0.2, scanlines: 0, vignette: 0.3, crtCurve: 0, phosphor: 0,
  };
  const visualParams = roomState?.visual_params
    ? ({ ...defaultVisualParams, ...roomState.visual_params }) as VisualParams
    : defaultVisualParams;
  visualParamsRef.current = visualParams;

  const currentTrack = tracks.find((t) => t.id === roomState?.current_track_id) || null;
  const sortedTracks = [...tracks].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  const currentIndex = sortedTracks.findIndex((t) => t.id === roomState?.current_track_id);
  const prevTrack = currentIndex > 0 ? sortedTracks[currentIndex - 1] : null;
  const nextTrack = currentIndex < sortedTracks.length - 1 ? sortedTracks[currentIndex + 1] : null;

  useEffect(() => { setMounted(true); loadRoom(); }, []);

  // Journey ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setJourney((prev) => {
        const updated = tickJourney(prev);
        if (updated !== prev) {
          applyInterpolatedState(updated, updated.isPlaying);
        }
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync journey with play state
  useEffect(() => {
    setJourney((prev) => {
      const updated = updateJourneyPlayState(prev, isPlaying);
      if (updated !== prev) {
        applyInterpolatedState(updated, isPlaying);
      }
      return updated;
    });
  }, [isPlaying]);

  // Cleanup latent field on unmount
  useEffect(() => {
    return () => {
      latentRef.current?.sleep();
    };
  }, []);

  function applyInterpolatedState(j: JourneyState, playing: boolean) {
    const raw = getInterpolatedState(j);
    const mod = latentRef.current?.modulation;
    if (mod && latentStateRef.current === "active" && !playing) {
      raw.glow = Math.min(1, raw.glow + 0.04 * mod.breath + 0.02 * mod.shimmer);
    }
    // Apply Field Controls modulation
    const vp = visualParamsRef.current;
    if (vp) {
      raw.glow = Math.min(1, raw.glow * (0.5 + vp.glow * 1.0));
      raw.speed *= (0.5 + vp.speed * 1.0);
      raw.density = Math.min(1, raw.density * (0.5 + vp.density * 1.0));
      raw.randomness = Math.min(1, raw.randomness * (0.5 + vp.randomness * 1.0));
      raw.lineDensity = Math.min(1, raw.lineDensity * (0.5 + vp.detail * 1.0));
      raw.fieldScale = Math.min(1, raw.fieldScale * (0.5 + vp.memory * 1.0));
      const intensityMul = 0.5 + vp.intensity * 1.0;
      raw.membraneAmount = Math.min(1, raw.membraneAmount * intensityMul);
      raw.topographyAmount = Math.min(1, raw.topographyAmount * intensityMul);
      raw.particleAmount = Math.min(1, raw.particleAmount * intensityMul);
      raw.gridAmount = Math.min(1, raw.gridAmount * intensityMul);
    }
    if (visibilityBoostRef.current) {
      const comp = visibilityCompensation(raw, playing);
      setInterpolatedState(comp.state);
      setCompActive(comp.active);
    } else {
      setInterpolatedState(raw);
      setCompActive(false);
    }
  }

  const handleToggleBoost = useCallback(() => {
    setVisibilityBoost((v) => !v);
  }, []);

  const loadRoom = async () => {
    const supabase = getClient();
    const { data: roomData } = await supabase.from("rooms").select("*").eq("slug", slug).single() as { data: Room | null };
    if (!roomData) { router.push("/"); return; }
    setRoom(roomData);

    const cid = searchParams.get("clientId") || uuid();
    const name = searchParams.get("name") || getSavedName() || "";
    setClientId(cid);
    setDisplayName(name);
    setIsHost(roomData.host_client_id === cid);

    const { data: trackData } = await supabase
      .from("tracks").select("*").eq("room_id", roomData.id).order("uploaded_at", { ascending: false }) as { data: Track[] | null };
    if (trackData) setTracks(trackData);

    const { data: stateData } = await supabase
      .from("room_state").select("*").eq("room_id", roomData.id).single() as { data: RoomState | null };
    if (stateData) {
      setRoomState(stateData);
    }

    const { data: clientData } = await supabase
      .from("connected_clients").select("*").eq("room_id", roomData.id) as { data: ConnectedClient[] | null };
    if (clientData) setClients(clientData);

    subscribeToRoom(roomData.id);
  };

  const subscribeToRoom = (roomId: string) => {
    const supabase = getClient();
    const channel = supabase.channel(`room-${roomId}`);

    channel.on("postgres_changes",
      { event: "*", schema: "public", table: "tracks", filter: `room_id=eq.${roomId}` },
      (payload) => {
        if (payload.eventType === "INSERT") {
          setTracks((prev) => [payload.new as Track, ...prev]);
        } else if (payload.eventType === "DELETE") {
          setTracks((prev) => prev.filter((t) => t.id !== payload.old.id));
        } else if (payload.eventType === "UPDATE") {
          setTracks((prev) => prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new as Partial<Track> } : t));
        }
      },
    );

    channel.on("postgres_changes",
      { event: "*", schema: "public", table: "room_state", filter: `room_id=eq.${roomId}` },
      (payload) => {
        const state = payload.new as RoomState;
        setRoomState(state);
        setIsPlaying(state.is_playing);
      },
    );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => setCurrentTime((prev) => prev + 0.25), 250);
    return () => clearInterval(interval);
  }, [isPlaying]);

  function setupAudioGraph(audio: HTMLAudioElement) {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const gain = ctx.createGain();
    gain.gain.value = 1;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);

    sourceRef.current = source;
    gainRef.current = gain;
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    console.log("[audiocontext] graph: audio -> source -> analyser -> gain(1) -> destination, state:", ctx.state);
  }

  useEffect(() => {
    if (!currentTrack) return;
    const audio = new Audio(currentTrack.file_url);
    audio.crossOrigin = "anonymous";
    audio.muted = false;
    audio.volume = 1;
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });
    audio.addEventListener("error", () => {
      console.error("[audio] error code:", audio.error?.code, audio.error?.message);
    });
    audio.addEventListener("canplay", () => {
      if (sourceRef.current) return;
      setupAudioGraph(audio);
    });
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      syncState({ is_playing: false, seek_position: 0 });
    });

    return () => {
      audio.pause();
      audio.src = "";
      sourceRef.current = null;
      gainRef.current = null;
      analyserRef.current = null;
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [currentTrack?.id]);

  const syncState = async (partial: Record<string, unknown>) => {
    if (!room) return;
    const supabase = getClient();
    const result = await supabase
      .from("room_state")
      .upsert({ room_id: room.id, ...partial }, { onConflict: "room_id" });
    if (result.error) console.error("[syncState] upsert error:", JSON.stringify(result.error), { partial });
  };

  const handlePlayPause = async () => {
    if (!audioRef.current || !isHost) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      syncState({ is_playing: false, paused_at: new Date().toISOString(), seek_position: audioRef.current.currentTime });
      return;
    }

    const el = audioRef.current;
    const ctx = audioCtxRef.current;

    if (ctx?.state === "suspended") {
      try { await ctx.resume(); } catch (e) {
        console.error("[play] resume failed:", e);
        alert("Audio context resume failed: " + (e instanceof Error ? e.message : String(e)));
        return;
      }
    }

    try {
      await el.play();
    } catch (err) {
      console.error("[play] play() failed:", err);
      alert("Playback failed: " + (err instanceof Error ? err.message : "Unknown error"));
      return;
    }

    if (latentRef.current) {
      latentRef.current.fadeOut();
      setLatentState("absorbed");
    }

    setIsPlaying(true);
    syncState({ is_playing: true, started_at: new Date().toISOString(), seek_position: el.currentTime });
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current || !isHost) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    syncState({ seek_position: time });
  };

  const handleSelectTrack = async (track: Track) => {
    if (!isHost || !room) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false);
    setCurrentTime(0);
    if (latentState === "dormant") handleWakeField();
    const supabase = getClient();
    await supabase.from("room_state").upsert(
      { room_id: room.id, current_track_id: track.id, is_playing: false, seek_position: 0 },
      { onConflict: "room_id" },
    );
    await supabase.from("tracks").update({ last_played_at: new Date().toISOString() }).eq("id", track.id);
  };

  const handleUpload = async (file: File) => {
    if (!room) return;
    if (latentState === "dormant") handleWakeField();
    setUploading(true);
    setUploadProgress(0);
    try {
      const supabase = getClient();
      const ext = file.name.split(".").pop();
      const filePath = `${room.id}/${uuid()}.${ext}`;

      const progressInterval = setInterval(() => setUploadProgress((prev) => Math.min(prev + 15, 85)), 500);
      const { error: uploadError } = await supabase.storage.from("audio").upload(filePath, file);
      clearInterval(progressInterval);
      if (uploadError) throw uploadError;
      setUploadProgress(100);

      const { data: urlData } = supabase.storage.from("audio").getPublicUrl(filePath);
      const fileUrl = urlData?.publicUrl || "";

      const { data: track, error: trackError } = await supabase.from("tracks").insert({
        room_id: room.id, original_filename: file.name, display_name: file.name.replace(/\.[^/.]+$/, ""),
        file_url: fileUrl, file_size: file.size, mime_type: file.type,
        uploaded_by_display_name: displayName, status: "ready", upload_progress: 100,
      }).select().single();

      if (trackError) throw trackError;
      if (tracks.length === 0 && track) syncState({ current_track_id: track.id });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    finally { setUploading(false); }
  };

  const handleExport = (format: "png" | "jpeg") => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `memory-field-${Date.now()}.${format}`;
    link.href = canvas.toDataURL(`image/${format === "jpeg" ? "jpeg" : "png"}`);
    link.click();
  };

  const joinRoom = async () => {
    if (!nameInput.trim() || !room) return;
    saveName(nameInput.trim());
    setDisplayName(nameInput.trim());
    setShowNameDialog(false);
    if (!searchParams.get("name")) {
      const supabase = getClient();
      const cid = uuid();
      setClientId(cid);
      await supabase.from("connected_clients").insert({
        client_id: cid, room_id: room.id, display_name: nameInput.trim(), role: "listener",
      });
    }
  };

  if (!room) {
    return <main className="min-h-screen flex items-center justify-center"><div className="text-subtle font-mono text-[11px]">Loading field...</div></main>;
  }

  const currentPreset = getPreset(journey.startPreset);
  const targetPreset = getPreset(journey.targetPreset);
  const journeyProgress = journey.transitionDuration > 0
    ? Math.min(100, ((Date.now() - journey.startTime) / journey.transitionDuration) * 100)
    : 0;

  return (
    <>
      <IdleAuroraField />
      <div className="fixed inset-0 z-[9999] pointer-events-none bg-deep" style={{ animation: 'fade-out 1.5s ease-out 0.2s forwards' }} />
      {mounted && currentTrack && isPlaying && (
        <CanvasVisualizer
          state={interpolatedState}
          analyserNode={analyserRef.current}
          isPlaying={isPlaying}
          glitchAmount={glitchEnabled ? 0.4 : 0}
        />
      )}

      <AtlasScan active={showAtlasScan} seed={roomSeed.current} />

      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute left-0 top-0 bottom-0 w-[400px] bg-gradient-to-r from-deep/60 to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-[460px] bg-gradient-to-l from-deep/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[140px] bg-gradient-to-t from-deep/60 to-transparent" />
      </div>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Memory Field</DialogTitle>
            <DialogDescription>Choose a name to join this room.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="join-name">Your name</Label>
              <Input id="join-name" placeholder="display name" value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()} autoFocus />
            </div>
            <Button className="w-full" onClick={joinRoom} disabled={!nameInput.trim()}>
              Join Field
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GlitchContainer active={glitchEnabled} frequency={0.0008}>
        <aside className="fixed top-8 left-8 bottom-8 w-[320px] rounded-3xl p-3 bg-blue-black/88 border border-white/[0.08] backdrop-blur-[16px] z-10 flex flex-col">
          <div className="shrink-0">
            <Brand />

            <UploadCapsule onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
            <div className="mt-3 mb-3">
              <NowPlaying track={currentTrack ? { display_name: currentTrack.display_name, duration: currentTrack.duration || 0 } : null} currentTime={currentTime} isPlaying={isPlaying} />
            </div>
          </div>
          <MemoryArchive tracks={sortedTracks} currentTrackId={roomState?.current_track_id || null} isPlaying={isPlaying} isHost={isHost} archivedTrackIds={archivedTrackIds} onArchive={handleArchive} onSelectTrack={handleSelectTrack} />
        </aside>
      </GlitchContainer>

      <aside className="fixed top-8 right-8 bottom-8 w-[380px] rounded-3xl px-3 py-3 bg-blue-black/92 border border-white/[0.08] backdrop-blur-[18px] z-10 overflow-y-auto panel-scroll">
        {isDev ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">Visual Journey</span>
                <span className="font-mono text-[9px] text-frost/40">{currentPreset.name}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-subtle">→ {targetPreset.name}</span>
                  <span className="font-mono text-[9px] text-frost/50">{journeyProgress.toFixed(1)}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-brass transition-all duration-1000" style={{ width: `${journeyProgress}%` }} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" className="text-[9px] font-mono h-6 px-2" onClick={handleToggleBoost}>
                {visibilityBoost ? "Boost" : "NoBoost"}
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", showAtlasScan && "text-cyan/70")} onClick={() => setShowAtlasScan((v) => !v)}>
                Atlas
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", glitchEnabled && "text-violet/70")} onClick={() => setGlitchEnabled((v) => !v)}>
                Glitch
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", tuneMode && "text-amber/70")} onClick={() => setTuneMode((v) => !v)}>
                Tune
              </Button>
              <Button size="sm" variant="ghost" className="text-[9px] font-mono h-6 px-2" onClick={() => setShowDebug((v) => !v)}>
                {showDebug ? "Hide" : "Dbg"}
              </Button>
              <Button size="sm" variant="ghost" className="text-[9px] font-mono h-6 px-2" onClick={() => handleExport("png")}>
                PNG
              </Button>
            </div>
            {tuneMode && (
              <div className="border-t border-white/[0.06] pt-3">
                <VisualizerDebug
                  journey={journey}
                  interpolatedState={interpolatedState}
                  analyserNode={analyserRef.current}
                  onNextPreset={handleNextPreset}
                  onJumpTo={handleJumpTo}
                  onCompleteTransition={handleCompleteTransition}
                  onSetDuration={handleSetDuration}
                />
              </div>
            )}
            {showDebug && (
              <div className="space-y-1.5 font-mono text-[9px] text-frost/50">
                <div>room seed: {roomSeed.current}</div>
                <div>phase: {journey.phase}</div>
                <div>palette: {interpolatedState.palette.join(", ")}</div>
                <div>layers — m: {interpolatedState.membraneAmount.toFixed(2)} t: {interpolatedState.topographyAmount.toFixed(2)} p: {interpolatedState.particleAmount.toFixed(2)} g: {interpolatedState.gridAmount.toFixed(2)}</div>
                <div>glow: {interpolatedState.glow.toFixed(2)} blur: {interpolatedState.blur.toFixed(2)} speed: {interpolatedState.speed.toFixed(2)}</div>
                <div>audio sens: {interpolatedState.audioSensitivity.toFixed(2)}</div>
                <div className="border-t border-white/[0.06] pt-1 mt-2">
                  <div className={cn("text-[8px]", compActive ? "text-cyan/60" : "text-frost/30")}>
                    visibility comp: {compActive ? "ACTIVE" : "inactive"}
                  </div>
                  <div>brightness: {estimateBrightness(interpolatedState).toFixed(3)}</div>
                  <div>boost: {visibilityBoost ? "ON" : "OFF"}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <FieldControls
            visualModel={roomState?.visual_model || "signal-field"}
            paletteMode={roomState?.palette_mode || "mineral"}
            visualParams={visualParams}
            isHost={isHost}
            onModelChange={handleModelChange}
            onPaletteChange={handlePaletteChange}
            onParamChange={handleParamChange}
            onMutate={handleMutate}
            onExport={handleExport}
          />
        )}
      </aside>

      <GlitchContainer active={glitchEnabled} frequency={0.001}>
        <TransportBar currentTrack={currentTrack} isPlaying={isPlaying} currentTime={currentTime} duration={duration}
          isHost={isHost} syncStatus={syncStatus} onPlayPause={handlePlayPause} onSeek={handleSeek}
          onNext={() => nextTrack && handleSelectTrack(nextTrack)}
          nextTrack={nextTrack} />
      </GlitchContainer>

      {currentTrack && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setShowBypass((v) => !v)}
            className="font-mono text-[9px] uppercase tracking-wider text-frost/30 hover:text-frost/60 mb-1"
          >
            {showBypass ? "Hide" : "Debug"} audio
          </button>
          {showBypass && (
            <audio controls src={currentTrack.file_url} className="w-[400px] h-10" />
          )}
        </div>
      )}
    </>
  );
}
