"use client";

import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track, SyncStatus } from "@/types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TransportBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isHost: boolean;
  syncStatus: SyncStatus;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  previousTrack: Track | null;
  nextTrack: Track | null;
}

const syncColors: Record<SyncStatus, string> = {
  synced: "text-success",
  buffering: "text-brass",
  error: "text-error",
};

export function TransportBar({
  currentTrack, isPlaying, currentTime, duration, isHost, syncStatus,
  onPlayPause, onSeek, onPrevious, onNext, previousTrack, nextTrack,
}: TransportBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[min(860px,calc(100vw-64px))] h-[88px] rounded-3xl px-[18px] py-[14px] bg-graphite/88 border border-white/[0.08] backdrop-blur-[18px] shadow-[0_24px_80px_rgba(0,0,0,0.42)] flex items-center gap-4 z-50">
      {/* Previous Track Ghost */}
      <div className={cn("w-[140px] shrink-0", !previousTrack && "opacity-0 pointer-events-none")}>
        <div className="font-mono text-[9px] leading-[11px] uppercase tracking-[0.08em] text-frost/32 mb-0.5">
          Previous
        </div>
        <div className="font-sans text-[11px] leading-[14px] text-soft/38 truncate">
          {previousTrack?.display_name || "—"}
        </div>
      </div>

      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        disabled={!currentTrack || !isHost}
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all",
          "bg-white/[0.08] border border-white/[0.12]",
          "hover:bg-white/[0.13] hover:border-white/[0.22] hover:shadow-[0_0_24px_rgba(245,250,255,0.08)]",
          "active:scale-95",
          "disabled:opacity-36 disabled:cursor-not-allowed",
        )}
      >
        {isPlaying ? (
          <Pause className="w-[18px] h-[18px] text-frost" />
        ) : (
          <Play className="w-[18px] h-[18px] text-frost ml-0.5" />
        )}
      </button>

      {/* Current Track Block */}
      <div className="flex-1 min-w-[320px]">
        {currentTrack ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[9px] leading-[11px] uppercase text-brass tracking-[0.08em]">
                Now Playing
              </span>
            </div>
            <div className="text-[13px] leading-4 font-medium text-frost truncate mb-1">
              {currentTrack.display_name}
            </div>
            {/* Timeline */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] leading-[14px] text-frost/52 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div
                className={cn(
                  "flex-1 h-[3px] rounded-full bg-white/[0.10] relative cursor-pointer timeline-hover group",
                  isHost && "cursor-pointer",
                )}
                onClick={(e) => {
                  if (!isHost) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const pct = x / rect.width;
                  onSeek(pct * duration);
                }}
              >
                <div
                  className="h-full rounded-full bg-soft transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-frost opacity-0 group-hover:opacity-100 transition-opacity timeline-thumb"
                  style={{ left: `${progress}%`, marginLeft: -4 }}
                />
              </div>
              <span className="font-mono text-[11px] leading-[14px] text-frost/52 w-10">
                {formatTime(duration)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-[13px] leading-4 font-medium text-frost/40 text-center">
            No track loaded
          </div>
        )}
      </div>

      {/* Next Track Ghost */}
      <div className={cn("w-[140px] shrink-0 text-right", !nextTrack && "opacity-0 pointer-events-none")}>
        <div className="font-mono text-[9px] leading-[11px] uppercase tracking-[0.08em] text-frost/32 mb-0.5">
          Next
        </div>
        <div className="font-sans text-[11px] leading-[14px] text-soft/38 truncate">
          {nextTrack?.display_name || "—"}
        </div>
      </div>

      {/* Sync Status */}
      <div className={cn("w-[72px] shrink-0 text-center font-mono text-[9px] leading-3 uppercase tracking-[0.06em]", syncColors[syncStatus])}>
        {syncStatus}
      </div>
    </div>
  );
}
