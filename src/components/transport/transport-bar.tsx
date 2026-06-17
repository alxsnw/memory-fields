"use client";

import { Play, Pause, SkipForward } from "lucide-react";
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
  onNext: () => void;
  nextTrack: Track | null;
}

const syncColors: Record<SyncStatus, string> = {
  synced: "text-success",
  buffering: "text-brass",
  error: "text-error",
};

export function TransportBar({
  currentTrack, isPlaying, currentTime, duration, isHost, syncStatus,
  onPlayPause, onSeek, onNext, nextTrack,
}: TransportBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[min(860px,calc(100vw-64px))] h-[88px] rounded-3xl px-[18px] py-[14px] bg-graphite/88 border border-white/[0.08] backdrop-blur-[18px] shadow-[0_24px_80px_rgba(0,0,0,0.42)] flex items-center gap-4 z-50">

      {/* Left zone: Play/Pause */}
      <div className="w-[60px] shrink-0 flex items-center justify-center">
        <button
          onClick={onPlayPause}
          disabled={!currentTrack || !isHost}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all",
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
      </div>

      {/* Center zone: NOW PLAYING + progress */}
      <div className="flex-1 min-w-[280px]">
        {currentTrack ? (
          <>
            <div className="flex items-center gap-3 mb-0.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-brass/80">
                Now Playing
              </span>
              <span className={cn(
                "font-mono text-[8px] uppercase tracking-[0.08em] px-1.5 py-[1px] rounded-full border",
                syncColors[syncStatus],
                syncStatus === "synced" ? "border-success/20 bg-success/6" :
                syncStatus === "buffering" ? "border-brass/20 bg-brass/6" :
                "border-error/20 bg-error/6",
              )}>
                {syncStatus}
              </span>
            </div>
            <div className="text-[13px] leading-4 font-medium text-frost truncate mb-1">
              {currentTrack.display_name}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-frost/52 w-10 text-right shrink-0">
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
              <span className="font-mono text-[11px] text-frost/52 w-10 shrink-0">
                {formatTime(duration)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-[13px] leading-4 font-medium text-frost/40 text-center">
            Waiting for signal
          </div>
        )}
      </div>

      {/* Right zone: NEXT or spacer for balance */}
      {nextTrack ? (
        <div className="w-[140px] shrink-0 flex items-center justify-end gap-2">
          <span className="text-[11px] text-soft/50 truncate max-w-[90px]">
            {nextTrack.display_name}
          </span>
          <div className="flex flex-col items-end">
            <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-frost/32 leading-none mb-0.5">Next</span>
            <button onClick={onNext} disabled={!isHost} className="p-0.5 rounded hover:bg-white/[0.06] transition-colors disabled:opacity-30">
              <SkipForward className="w-3.5 h-3.5 text-frost/40" />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-[60px] shrink-0" />
      )}
    </div>
  );
}
