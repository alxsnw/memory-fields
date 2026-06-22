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
import { MemoryArchive } from "@/components/archive/memory-archive";
import { TransportBar } from "@/components/transport/transport-bar";
import { CanvasVisualizer } from "@/components/visualizer/canvas-visualizer";
import AtlasScan from "@/components/visualizer/atlas-scan";
import IdleAuroraField from "@/components/visualizer/idle-aurora-field";
import { GlitchContainer } from "@/components/ui/glitch-container";
import { FieldControls } from "@/components/sidebar/field-controls";
import { useListenerMetric } from "@/lib/use-listener-metric";
import { DailyListenerCount } from "@/components/metrics/daily-listener-count";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { List, SlidersHorizontal, X } from "lucide-react";

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
  const [mobilePanel, setMobilePanel] = useState<null | "tracks" | "controls">(null);
  const visibilityBoostRef = useRef(true);
  visibilityBoostRef.current = visibilityBoost;
  const visualParamsRef = useRef<VisualParams>(undefined as unknown as VisualParams);
  const liveSliderRef = useRef<{ coreTraceAmount?: number; density?: number; speed?: number }>({});
  const benchRef = useRef({ dprOverride: 0 });
  const [compActive, setCompActive] = useState(false);
  const [archivedTrackIds, setArchivedTrackIds] = useState<Set<string>>(new Set());

  const { totalCount, registerListen } = useListenerMetric();

  // Visual mode transition system
  const [activeVisualMode, setActiveVisualMode] = useState<"signal-field" | "spatial-rhythm" | "particle-memory" | "noise-memory" | "latent-flow">("spatial-rhythm");
  const [prevVisualMode, setPrevVisualMode] = useState<"signal-field" | "spatial-rhythm" | "particle-memory" | "noise-memory" | "latent-flow">("spatial-rhythm");
  const [transitionProgress, setTransitionProgress] = useState(1);
  const [idleTransitionProgress, setIdleTransitionProgress] = useState(0);
  const transitionRef = useRef<{ start: number; duration: number; from: "signal-field" | "spatial-rhythm" | "particle-memory" | "noise-memory" | "latent-flow"; to: "signal-field" | "spatial-rhythm" | "particle-memory" | "noise-memory" | "latent-flow" } | null>(null);
  const idleTransitionRef = useRef<{ start: number; duration: number; target: number } | null>(null);

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
    
    // Start visual mode transition
    if (model === "signal-field" || model === "spatial-rhythm" || model === "particle-memory" || model === "noise-memory" || model === "latent-flow") {
      const fromMode = activeVisualMode;
      const toMode = model;
      
      if (fromMode !== toMode) {
        transitionRef.current = {
          start: performance.now(),
          duration: 5000, // 5 seconds
          from: fromMode,
          to: toMode,
        };
        setPrevVisualMode(fromMode);
        setActiveVisualMode(toMode);
        setTransitionProgress(0);
      }
    }
    
    syncState({ visual_model: model });
  }, [isHost, room, activeVisualMode]);

  const handlePaletteChange = useCallback((mode: PaletteMode) => {
    if (!isHost || !room) return;
    syncState({ palette_mode: mode });
  }, [isHost, room]);

  const handleParamChange = useCallback((params: Partial<VisualParams>) => {
    if (!isHost || !room || !roomState) return;
    const merged = { ...roomState.visual_params, ...params };
    syncState({ visual_params: merged });
  }, [isHost, room, roomState]);

  const handleLiveParamChange = useCallback((params: Partial<VisualParams>) => {
    if (params.coreTraceAmount !== undefined) liveSliderRef.current.coreTraceAmount = params.coreTraceAmount;
    if (params.density !== undefined) liveSliderRef.current.density = params.density;
    if (params.speed !== undefined) liveSliderRef.current.speed = params.speed;
    if (params.coreTraceAmount !== undefined) visualParamsRef.current.coreTraceAmount = params.coreTraceAmount;
  }, []);

  const handleBenchDpr = useCallback((dpr: number) => {
    benchRef.current.dprOverride = dpr;
    window.dispatchEvent(new Event("resize"));
  }, []);

  const handleBenchReport = useCallback(() => {
    console.log("=== BENCHMARK REPORT ===");
    console.log("Benchmark report triggered. Check CanvasVisualizer overlay for live data.");
  }, []);

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
  const autoPlayRef = useRef(false);

  const roomSeed = useRef(getRoomSeed(slug));
  const [journey, setJourney] = useState(() => createJourney(roomSeed.current, false));
  const [interpolatedState, setInterpolatedState] = useState<InterpolatedState>(() => {
    const raw = getInterpolatedState(journey);
    const comp = visibilityCompensation(raw, false);
    return comp.state;
  });

  const isDev = searchParams.get("dev") === "true";

  const defaultVisualParams: VisualParams = {
    intensity: 0.5, coreTraceAmount: 0, density: 0.5, speed: 0.5, memory: 0.5, detail: 0.5,
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

  // Visual mode transition animation
  useEffect(() => {
    let rafId: number;
    const animate = () => {
      if (transitionRef.current) {
        const elapsed = performance.now() - transitionRef.current.start;
        const progress = Math.min(1, elapsed / transitionRef.current.duration);
        // Smoothstep easing
        const eased = progress * progress * (3 - 2 * progress);
        setTransitionProgress(eased);
        
        if (progress >= 1) {
          transitionRef.current = null;
        }
      }
      
      if (idleTransitionRef.current) {
        const elapsed = performance.now() - idleTransitionRef.current.start;
        const progress = Math.min(1, elapsed / idleTransitionRef.current.duration);
        const eased = progress * progress * (3 - 2 * progress);
        setIdleTransitionProgress(eased * idleTransitionRef.current.target);
        
        if (progress >= 1) {
          idleTransitionRef.current = null;
        }
      }
      
      rafId = requestAnimationFrame(animate);
    };
    
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

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
    let lastTime = 0;
    let stalledSec = 0;
    const interval = setInterval(() => {
      const el = audioRef.current;
      if (!el) return;

      // Resume AudioContext if suspended
      const ctx = audioCtxRef.current;
      if (ctx?.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      if (el.paused) {
        // Audio is paused but app thinks it's playing — try to resume
        stalledSec += 0.25;
        if (stalledSec > 1) {
          console.warn("[audio] unexpectedly paused, attempting resume");
          el.play().catch(() => {});
          if (ctx?.state === "suspended") ctx.resume().catch(() => {});
          stalledSec = 0;
        }
        return;
      }

      setCurrentTime(el.currentTime);
      if (el.currentTime === lastTime && lastTime > 0) {
        stalledSec += 0.25;
        if (stalledSec > 3) {
          console.warn("[audio] stall detected, attempting resume");
          el.play().catch(() => {});
          stalledSec = 0;
        }
      } else {
        stalledSec = 0;
      }
      lastTime = el.currentTime;
    }, 250);
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
    audio.addEventListener("stalled", () => {
      console.warn("[audio] stalled — buffering issue");
    });
    audio.addEventListener("waiting", () => {
      console.warn("[audio] waiting — loading data");
    });
    audio.addEventListener("suspend", () => {
      console.warn("[audio] suspend — load suspended");
    });
    audio.addEventListener("canplay", () => {
      if (sourceRef.current) return;
      setupAudioGraph(audio);
    });

    // If autoPlayRef is set, start playback when audio is ready
    const autoPlayTriggered = autoPlayRef.current;
    console.log("[autoplay] effect run — newTrackId:", currentTrack?.id, "autoPlayRef:", autoPlayRef.current, "readyState:", audio.readyState);
    if (autoPlayRef.current) {
      autoPlayRef.current = false;
      console.log("[autoplay] autoPlay triggered — starting playback");
      const tryPlay = () => {
        console.log("[autoplay] tryPlay — AudioContext state:", audioCtxRef.current?.state);
        if (audioCtxRef.current?.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        audio.play().then(() => {
          console.log("[autoplay] audio.play() resolved");
          setIsPlaying(true);
          syncState({ is_playing: true, started_at: new Date().toISOString(), seek_position: 0 });
        }).catch((err) => {
          console.warn("[autoplay] audio.play() rejected:", err);
          setIsPlaying(false);
        });
      };
      if (audio.readyState >= 3) {
        console.log("[autoplay] readyState >= HAVE_FUTURE_DATA, playing immediately");
        tryPlay();
      } else {
        console.log("[autoplay] readyState < HAVE_FUTURE_DATA, waiting for canplay");
        audio.addEventListener("canplay", tryPlay, { once: true });
        // Fallback: if canplay doesn't fire within 2s, force play anyway
        const fallbackTimer = setTimeout(() => {
          if (!audio.paused) return;
          console.log("[autoplay] fallback — canplay not fired, forcing play");
          audio.play().then(() => {
            console.log("[autoplay] fallback play resolved");
            setIsPlaying(true);
          }).catch((err) => {
            console.warn("[autoplay] fallback play rejected:", err);
          });
        }, 2000);
        audio.addEventListener("canplay", () => clearTimeout(fallbackTimer), { once: true });
      }
    }

    audio.addEventListener("ended", async () => {
      // Check if this is a real end or a premature stop
      const realEnd = audio.duration > 0 && Math.abs(audio.currentTime - audio.duration) < 0.5;
      console.log("[autoplay] ended fired — currentTime:", audio.currentTime, "duration:", audio.duration, "realEnd:", realEnd, "trackId:", currentTrack?.id);
      if (!realEnd) {
        console.warn("[autoplay] premature ended — resuming");
        audio.play().catch(() => {});
        return;
      }
      setIsPlaying(false);
      
      // Start track-to-track visual transition
      idleTransitionRef.current = {
        start: performance.now(),
        duration: 4000, // 4 seconds
        target: 0.3, // Partial fade for track transition
      };
      
      // Auto-advance to next track (with loop)
      const sorted = [...tracks].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      const idx = sorted.findIndex(t => t.id === roomState?.current_track_id);
      console.log("[autoplay] playlist — length:", sorted.length, "currentIdx:", idx, "currentId:", roomState?.current_track_id);
      if (isHost && sorted.length > 0) {
        const nextIdx = idx < sorted.length - 1 ? idx + 1 : 0;
        const next = sorted[nextIdx];
        console.log("[autoplay] next track — idx:", nextIdx, "id:", next?.id, "url exists:", !!next?.file_url);
        if (room && next) {
          autoPlayRef.current = true;
          console.log("[autoplay] upserting room_state — roomId:", room.id, "nextTrackId:", next.id);
          const { error: upsertErr } = await getClient().from("room_state").upsert(
            { room_id: room.id, current_track_id: next.id, is_playing: true, seek_position: 0 },
            { onConflict: "room_id" },
          );
          console.log("[autoplay] upsert complete — error:", upsertErr?.message || "none");
        } else {
          console.warn("[autoplay] cannot advance — room:", !!room, "next:", !!next);
        }
      } else {
        console.log("[autoplay] no next track — isHost:", isHost, "tracks:", sorted.length);
        syncState({ is_playing: false, seek_position: 0 });
      }
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

  // Auto-play first track after upload
  useEffect(() => {
    if (!currentTrack || !isHost || isPlaying) return;
    if (tracks.length !== 1) return; // Only auto-play for the very first track

    const audio = audioRef.current;
    if (!audio) return;

    const tryAutoPlay = () => {
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      audio.play().then(() => {
        setIsPlaying(true);
        registerListen();
        syncState({ is_playing: true, started_at: new Date().toISOString(), seek_position: 0 });
      }).catch((err) => {
        console.warn("[autoplay] failed:", err);
      });
    };

    if (audio.readyState >= 3) {
      tryAutoPlay();
    } else {
      audio.addEventListener("canplay", tryAutoPlay, { once: true });
    }
  }, [currentTrack?.id, tracks.length, isHost]);

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
      
      // Start pause transition (10 seconds fade to idle)
      idleTransitionRef.current = {
        start: performance.now(),
        duration: 10000, // 10 seconds
        target: 1, // Full fade to idle
      };
      
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

    // Start play transition (5 seconds fade from idle)
    idleTransitionRef.current = {
      start: performance.now(),
      duration: 5000, // 5 seconds
      target: 0, // Fade back to active
    };

    if (latentRef.current) {
      latentRef.current.fadeOut();
      setLatentState("absorbed");
    }

    setIsPlaying(true);
    registerListen();
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
    
    // If clicking on already active track, toggle play/pause
    if (track.id === roomState?.current_track_id) {
      if (isPlaying) {
        handlePlayPause();
      } else {
        handlePlayPause();
      }
      return;
    }
    
    // Switch to new track and start playing
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false);
    setCurrentTime(0);
    if (latentState === "dormant") handleWakeField();
    const supabase = getClient();
    await supabase.from("room_state").upsert(
      { room_id: room.id, current_track_id: track.id, is_playing: true, seek_position: 0 },
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
      const { error: uploadError } = await supabase.storage.from("audio").upload(filePath, file, { upsert: true });
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
      // Only set first track and trigger autoplay if this is NOT part of a multi-upload batch
      if (tracks.length === 0 && track && batchRef.current.total <= 1) {
        syncState({ current_track_id: track.id });
      }
      // For multi-upload batches: after batch completes, handleMultiUpload will set the first track
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    finally { setUploading(false); }
  };

  // Queue for sequential multi-file upload
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const batchRef = useRef({ total: 0, done: 0 });
  const handleMultiUpload = useCallback((file: File) => {
    batchRef.current.total++;
    const isMulti = batchRef.current.total > 1;
    if (isMulti && batchRef.current.done === 0) {
      console.log("[upload-batch] start — count:", batchRef.current.total);
    }
    uploadQueueRef.current = uploadQueueRef.current.then(async () => {
      batchRef.current.done++;
      console.log("[upload-batch] uploaded — index:", batchRef.current.done, "of", batchRef.current.total);
      setUploadProgress(Math.round((batchRef.current.done / batchRef.current.total) * 100));
      await handleUpload(file);
      // After the last file in a multi-upload batch: set first track
      if (isMulti && batchRef.current.done === batchRef.current.total) {
        // Small delay for realtime to populate tracks state
        await new Promise(r => setTimeout(r, 600));
        const supabase = getClient();
        const { data: tracks } = await supabase
          .from("tracks")
          .select("id")
          .eq("room_id", room!.id)
          .order("uploaded_at", { ascending: false })
          .limit(1);
        if (tracks && tracks.length > 0 && room) {
          console.log("[upload-batch] complete — firstTrackId:", tracks[0].id, "setting current track + autoplay");
          autoPlayRef.current = true;
          syncState({ current_track_id: tracks[0].id });
        }
        batchRef.current.total = 0;
        batchRef.current.done = 0;
      }
    });
    return uploadQueueRef.current;
  }, [room, latentState, displayName, syncState]);

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
    return (
      <>
        <div className="fixed inset-0 z-[9999] pointer-events-none bg-deep" style={{ animation: 'fade-out 2s ease-out 1s forwards' }} />
        <main className="min-h-screen flex items-center justify-center"><div className="text-subtle font-mono text-[11px]">Loading field...</div></main>
      </>
    );
  }

  const currentPreset = getPreset(journey.startPreset);
  const targetPreset = getPreset(journey.targetPreset);
  const journeyProgress = journey.transitionDuration > 0
    ? Math.min(100, ((Date.now() - journey.startTime) / journey.transitionDuration) * 100)
    : 0;

  return (
    <>
      <IdleAuroraField />
      <div className="fixed inset-0 z-[9999] pointer-events-none bg-deep" style={{ animation: 'fade-out 2s ease-out 1s forwards' }} />
      {mounted && currentTrack && (isPlaying || idleTransitionProgress > 0) && (
        <CanvasVisualizer
          state={interpolatedState}
          analyserNode={analyserRef.current}
          isPlaying={isPlaying}
          glitchAmount={visualParams.glitchAmount}
          vhsAmount={visualParams.vhsAmount}
          coreTraceAmount={visualParams.coreTraceAmount}
          activeVisualMode={activeVisualMode}
          prevVisualMode={prevVisualMode}
          transitionProgress={transitionProgress}
          idleTransitionProgress={idleTransitionProgress}
          paletteMode={roomState?.palette_mode || "mineral"}
          liveSliderRef={liveSliderRef}
          benchRef={benchRef}
        />
      )}

      <AtlasScan active={showAtlasScan} seed={roomSeed.current} />

      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute left-0 top-0 bottom-0 w-[400px] bg-gradient-to-r from-deep/60 to-transparent hidden md:block md:w-[300px] lg:w-[400px]" />
        <div className="absolute right-0 top-0 bottom-0 w-[460px] bg-gradient-to-l from-deep/60 to-transparent hidden lg:block" />
        <div className="absolute bottom-0 left-0 right-0 h-[140px] bg-gradient-to-t from-deep/60 to-transparent md:h-[100px]" />
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
        <aside className="fixed top-8 left-8 w-[320px] rounded-3xl p-3 bg-blue-black/88 border border-white/[0.08] backdrop-blur-[16px] z-10 flex-col hidden md:flex md:w-[280px] lg:w-[320px]" style={{ animation: 'sidebar-slide-in 0.6s ease-out 1.2s forwards', opacity: 0, bottom: tracks.length > 0 ? 'auto' : '2rem', paddingBottom: tracks.length > 0 ? '0' : '0.75rem' }}>
          <div className="shrink-0">
            <Brand />

            <UploadCapsule onUpload={handleMultiUpload} uploading={uploading} progress={uploadProgress} multi />
            
            {/* Mini-manifest */}
            <p className="mt-3 mb-8 text-[10.5px] leading-[1.4] text-frost/42 max-w-[280px]">
              Memory Fields listens to sound as a living archive.
              Each track becomes a temporary room of motion, color and memory.
            </p>
          </div>
          {tracks.length > 0 && (
            <div className="flex-1 min-h-0 mb-8" style={{ animation: 'sidebar-fade-in 280ms ease-out forwards' }}>
              <MemoryArchive tracks={sortedTracks} currentTrackId={roomState?.current_track_id || null} isPlaying={isPlaying} isHost={isHost} archivedTrackIds={archivedTrackIds} onArchive={handleArchive} onSelectTrack={handleSelectTrack} />
            </div>
          )}
          <div className="mt-auto pt-2 pb-1">
            <DailyListenerCount count={totalCount} />
          </div>
        </aside>
      </GlitchContainer>

      <aside className="fixed top-8 right-8 bottom-8 w-[380px] rounded-3xl px-3 py-3 bg-blue-black/92 border border-white/[0.08] backdrop-blur-[18px] z-10 overflow-y-auto panel-scroll hidden lg:block">
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
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", benchRef.current.dprOverride === 1 && "text-cyan/70")} onClick={() => handleBenchDpr(benchRef.current.dprOverride === 1 ? 0 : 1)}>
                DPR1
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", benchRef.current.dprOverride === 1.25 && "text-cyan/70")} onClick={() => handleBenchDpr(benchRef.current.dprOverride === 1.25 ? 0 : 1.25)}>
                DPR1.25
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", benchRef.current.dprOverride === 1.5 && "text-cyan/70")} onClick={() => handleBenchDpr(benchRef.current.dprOverride === 1.5 ? 0 : 1.5)}>
                DPR1.5
              </Button>
              <Button size="sm" variant="ghost" className="text-[9px] font-mono h-6 px-2" onClick={handleBenchReport}>
                Report
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", window.__srVariant?.mode === 0 && "text-cyan/70")} onClick={() => { (window as any).__srVariant = (window as any).__srVariant || { mode: 0 }; (window as any).__srVariant.mode = 0; }}>
                SRv0
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", window.__srVariant?.mode === 1 && "text-cyan/70")} onClick={() => { (window as any).__srVariant = (window as any).__srVariant || { mode: 0 }; (window as any).__srVariant.mode = 1; }}>
                SRv1
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", window.__srVariant?.mode === 2 && "text-cyan/70")} onClick={() => { (window as any).__srVariant = (window as any).__srVariant || { mode: 0 }; (window as any).__srVariant.mode = 2; }}>
                SRv2
              </Button>
              <Button size="sm" variant="ghost" className={cn("text-[9px] font-mono h-6 px-2", window.__srVariant?.mode === 3 && "text-cyan/70")} onClick={() => { (window as any).__srVariant = (window as any).__srVariant || { mode: 0 }; (window as any).__srVariant.mode = 3; }}>
                SRv3
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
            visualModel={activeVisualMode}
            paletteMode={roomState?.palette_mode || "mineral"}
            visualParams={visualParams}
            isHost={isHost}
            onModelChange={handleModelChange}
            onPaletteChange={handlePaletteChange}
            onParamChange={handleParamChange}
            onLiveParamChange={handleLiveParamChange}
            onMutate={handleMutate}
            onExport={handleExport}
          />
        )}
      </aside>

      {/* Mobile drawer toggles */}
      <div className="fixed top-8 left-8 z-20 flex flex-col gap-3 lg:hidden">
        {tracks.length > 0 && (
          <button
            onClick={() => setMobilePanel(mobilePanel === "tracks" ? null : "tracks")}
            className="w-11 h-11 rounded-xl bg-blue-black/88 border border-white/[0.08] backdrop-blur-[16px] flex items-center justify-center text-frost/60 hover:text-frost transition-colors"
          >
            {mobilePanel === "tracks" ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        )}
      </div>
      <div className="fixed top-8 right-8 z-20 md:hidden">
        <button
          onClick={() => setMobilePanel(mobilePanel === "controls" ? null : "controls")}
          className="w-11 h-11 rounded-xl bg-blue-black/88 border border-white/[0.08] backdrop-blur-[16px] flex items-center justify-center text-frost/60 hover:text-frost transition-colors"
        >
          {mobilePanel === "controls" ? <X className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
        </button>
      </div>

      <GlitchContainer active={glitchEnabled} frequency={0.001}>
        <TransportBar currentTrack={currentTrack} isPlaying={isPlaying} currentTime={currentTime} duration={duration}
          isHost={isHost} syncStatus={syncStatus} onPlayPause={handlePlayPause} onSeek={handleSeek}
          onNext={() => nextTrack && handleSelectTrack(nextTrack)}
          nextTrack={nextTrack} />
      </GlitchContainer>

      {/* Mobile drawers */}
      {mobilePanel === "tracks" && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobilePanel(null)}>
          <div className="absolute inset-0 bg-deep/60 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 max-h-[65vh] bg-blue-black/95 border-t border-white/[0.08] rounded-t-3xl p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">Loaded Signals</span>
              <button onClick={() => setMobilePanel(null)} className="text-frost/40 hover:text-frost">
                <X className="w-4 h-4" />
              </button>
            </div>
            <MemoryArchive tracks={sortedTracks} currentTrackId={roomState?.current_track_id || null} isPlaying={isPlaying} isHost={isHost} archivedTrackIds={archivedTrackIds} onArchive={handleArchive} onSelectTrack={handleSelectTrack} />
          </div>
        </div>
      )}
      {mobilePanel === "controls" && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobilePanel(null)}>
          <div className="absolute inset-0 bg-deep/60 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 max-h-[65vh] bg-blue-black/95 border-t border-white/[0.08] rounded-t-3xl p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">Field Controls</span>
              <button onClick={() => setMobilePanel(null)} className="text-frost/40 hover:text-frost">
                <X className="w-4 h-4" />
              </button>
            </div>
            <FieldControls
              visualModel={activeVisualMode}
              paletteMode={roomState?.palette_mode || "mineral"}
              visualParams={visualParams}
              isHost={isHost}
              onModelChange={handleModelChange}
              onPaletteChange={handlePaletteChange}
              onParamChange={handleParamChange}
              onLiveParamChange={handleLiveParamChange}
              onMutate={handleMutate}
              onExport={handleExport}
            />
          </div>
        </div>
      )}

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
