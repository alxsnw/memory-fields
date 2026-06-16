// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { v4 as uuid } from "uuid";
import { supabase as getSupabase } from "@/lib/supabase";
import { getSavedName, saveName } from "@/lib/name-store";
import { cn } from "@/lib/utils";
import type { Room, Track, RoomState, ConnectedClient, VisualModel, PaletteMode, VisualParams, SyncStatus } from "@/types";

import Brand from "@/components/sidebar/brand";
import UploadCapsule from "@/components/sidebar/upload-capsule";
import NowPlaying from "@/components/sidebar/now-playing";
import { MemoryArchive } from "@/components/archive/memory-archive";
import { TransportBar } from "@/components/transport/transport-bar";
import { FieldControls } from "@/components/sidebar/field-controls";
import { CanvasVisualizer } from "@/components/visualizer/canvas-visualizer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const defaultVisualParams: VisualParams = {
  intensity: 50, density: 50, speed: 50, memory: 50, detail: 50, glow: 40,
  randomness: 30, smoothing: true, smoothingAmount: 50, coreSize: 42,
  expansion: 50, edgeReactivity: 65, centerBias: 72, bloom: 20, grain: 0,
  grainIntensity: 30, grainSize: 50, chromatic: 0, scanlines: 0,
  vignette: 20, crtCurve: 0, phosphor: 0,
};

function getClient() {
  return getSupabase();
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

  const [visualModel, setVisualModel] = useState<VisualModel>("signal-field");
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("mineral");
  const [visualParams, setVisualParams] = useState<VisualParams>(defaultVisualParams);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const currentTrack = tracks.find((t) => t.id === roomState?.current_track_id) || null;
  const sortedTracks = [...tracks].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  const currentIndex = sortedTracks.findIndex((t) => t.id === roomState?.current_track_id);
  const prevTrack = currentIndex > 0 ? sortedTracks[currentIndex - 1] : null;
  const nextTrack = currentIndex < sortedTracks.length - 1 ? sortedTracks[currentIndex + 1] : null;

  useEffect(() => { setMounted(true); loadRoom(); }, []);

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
      setVisualModel(stateData.visual_model as VisualModel);
      setPaletteMode(stateData.palette_mode as PaletteMode);
      if (stateData.visual_params) {
        setVisualParams((prev) => ({ ...prev, ...stateData.visual_params as Partial<VisualParams> }));
      }
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
        setVisualModel(state.visual_model as VisualModel);
        setPaletteMode(state.palette_mode as PaletteMode);
        if (state.visual_params) {
          setVisualParams((prev) => ({ ...prev, ...state.visual_params as Partial<VisualParams> }));
        }
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

  useEffect(() => {
    if (!currentTrack) return;
    console.log("[audio] creating audio, url:", currentTrack.file_url?.slice(0, 60));
    const audio = new Audio(currentTrack.file_url);
    audio.volume = 1;
    audio.preload = "auto";
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => {
      console.log("[audio] loadedmetadata, duration:", audio.duration);
      setDuration(audio.duration);
    });
    audio.addEventListener("error", (e) => {
      console.error("[audio] error:", audio.error?.code, audio.error?.message, e);
    });
    audio.addEventListener("canplay", () => console.log("[audio] canplay"));
    audio.addEventListener("ended", () => { setIsPlaying(false); syncState({ is_playing: false, current_time: 0 }); });
    return () => { audio.pause(); audio.src = ""; };
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    console.log("[audiocontext] creating context");
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    console.log("[audiocontext] created, state:", ctx.state);
    return () => { console.log("[audiocontext] closing"); ctx.close(); };
  }, [currentTrack?.id]);

  const syncState = async (partial: Record<string, unknown>) => {
    if (!room) return;
    const supabase = getClient();
    await supabase.from("room_state").update(partial).eq("room_id", room.id);
  };

  const handlePlayPause = async () => {
    if (!audioRef.current || !isHost) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      syncState({ is_playing: false, paused_at: new Date().toISOString(), current_time: audioRef.current.currentTime });
    } else {
      console.log("[play] AudioContext state:", audioCtxRef.current?.state);
      console.log("[play] audio src:", audioRef.current.src?.slice(0, 60));
      console.log("[play] audio readyState:", audioRef.current.readyState);
      if (audioCtxRef.current?.state === "suspended") {
        console.log("[play] resuming AudioContext");
        await audioCtxRef.current.resume();
        console.log("[play] AudioContext state after resume:", audioCtxRef.current?.state);
      }
      try {
        await audioRef.current.play();
        console.log("[play] play() succeeded");
      } catch (err) {
        console.error("[play] play() failed:", err);
        alert("Playback failed: " + (err instanceof Error ? err.message : "Unknown error"));
      }
      setIsPlaying(true);
      syncState({ is_playing: true, started_at: new Date().toISOString(), current_time: audioRef.current.currentTime });
    }
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current || !isHost) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    syncState({ current_time: time });
  };

  const handleSelectTrack = async (track: Track) => {
    if (!isHost || !room) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false);
    setCurrentTime(0);
    const supabase = getClient();
    await supabase.from("room_state").update({ current_track_id: track.id, is_playing: false, current_time: 0 }).eq("room_id", room.id);
    await supabase.from("tracks").update({ last_played_at: new Date().toISOString() }).eq("id", track.id);
  };

  const handleUpload = async (file: File) => {
    if (!room) return;
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

  const handleModelChange = async (model: VisualModel) => {
    setVisualModel(model);
    if (isHost && room) {
      const supabase = getClient();
      await supabase.from("room_state").update({ visual_model: model }).eq("room_id", room.id);
    }
  };

  const handlePaletteChange = async (mode: PaletteMode) => {
    setPaletteMode(mode);
    if (isHost && room) {
      const supabase = getClient();
      await supabase.from("room_state").update({ palette_mode: mode }).eq("room_id", room.id);
    }
  };

  const handleParamChange = async (params: Partial<VisualParams>) => {
    const updated = { ...visualParams, ...params };
    setVisualParams(updated);
    if (isHost && room) {
      const supabase = getClient();
      await supabase.from("room_state").update({ visual_params: updated }).eq("room_id", room.id);
    }
  };

  const handleMutate = async () => {
    const models: VisualModel[] = ["signal-field", "spatial-rhythm", "particle-memory", "topographic-wave", "orbital-spectrum", "spectral-grid", "ascii-field"];
    const newModel = models[Math.floor(Math.random() * models.length)];
    const mutatedParams = {
      ...visualParams,
      randomness: Math.min(100, Math.max(0, visualParams.randomness + (Math.random() - 0.5) * 30)),
      intensity: Math.min(100, Math.max(0, visualParams.intensity + (Math.random() - 0.5) * 20)),
      density: Math.min(100, Math.max(0, visualParams.density + (Math.random() - 0.5) * 20)),
      speed: Math.min(100, Math.max(0, visualParams.speed + (Math.random() - 0.5) * 15)),
      memory: Math.min(100, Math.max(0, visualParams.memory + (Math.random() - 0.5) * 15)),
      expansion: Math.min(100, Math.max(0, visualParams.expansion + (Math.random() - 0.5) * 15)),
    };
    setVisualModel(newModel);
    setVisualParams(mutatedParams);
    if (isHost && room) {
      const supabase = getClient();
      await supabase.from("room_state").update({
        visual_model: newModel, visual_seed: Math.floor(Math.random() * 9999), visual_params: mutatedParams,
      }).eq("room_id", room.id);
    }
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

  return (
    <>
      {mounted && (
        <CanvasVisualizer
          model={visualModel}
          paletteMode={paletteMode}
          params={visualParams}
          analyserNode={analyserRef.current}
          isPlaying={isPlaying}
        />
      )}

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

      <aside className="fixed top-8 left-8 bottom-8 w-[320px] rounded-3xl p-4 bg-blue-black/88 border border-white/[0.08] backdrop-blur-[16px] z-10 flex flex-col">
        <div className="shrink-0">
          <Brand />
          <UploadCapsule onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
          <div className="mt-5 mb-5">
            <NowPlaying track={currentTrack ? { display_name: currentTrack.display_name, duration: currentTrack.duration || 0 } : null} currentTime={currentTime} isPlaying={isPlaying} />
          </div>
        </div>
        <MemoryArchive tracks={sortedTracks} currentTrackId={roomState?.current_track_id || null} isPlaying={isPlaying} isHost={isHost} onSelectTrack={handleSelectTrack} />
      </aside>

      <aside className="fixed top-8 right-8 bottom-8 w-[380px] rounded-3xl p-4 bg-blue-black/92 border border-white/[0.08] backdrop-blur-[18px] z-10 overflow-y-auto">
        <FieldControls visualModel={visualModel} paletteMode={paletteMode} visualParams={visualParams} isHost={isHost}
          onModelChange={handleModelChange} onPaletteChange={handlePaletteChange} onParamChange={handleParamChange}
          onMutate={handleMutate} onExport={handleExport} />
      </aside>

      <TransportBar currentTrack={currentTrack} isPlaying={isPlaying} currentTime={currentTime} duration={duration}
        isHost={isHost} syncStatus={syncStatus} onPlayPause={handlePlayPause} onSeek={handleSeek}
        onPrevious={() => prevTrack && handleSelectTrack(prevTrack)}
        onNext={() => nextTrack && handleSelectTrack(nextTrack)}
        previousTrack={prevTrack} nextTrack={nextTrack} />
    </>
  );
}
