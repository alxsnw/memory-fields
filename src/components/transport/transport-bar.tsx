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
    <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[min(860px,calc(100vw-64px))] h-[88px] rounded-3xl px-[18px] py-[14px] bg-graphite/88 border border-white/[0.08] backdrop-blur-[18px] shadow-[0_24px_80px_rgba(0,0,0,0.42)] flex items-center gap-4 z-50 md:bottom-4 md:h-[72px] md:px-3 md:py-2 md:rounded-2xl md:gap-2 md:w-[calc(100vw-16px)] lg:w-[min(860px,calc(100vw-64px))] lg:h-[88px] lg:px-[18px] lg:py-[14px] lg:rounded-3xl lg:gap-4 lg:bottom-8">

      {/* Left zone: Play/Pause */}
      <div className="w-[60px] shrink-0 flex items-center justify-center md:w-[44px] lg:w-[60px]">
        <button
          onClick={onPlayPause}
          disabled={!currentTrack || !isHost}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all",
            "bg-white/[0.08] border border-white/[0.12]",
            "hover:bg-white/[0.13] hover:border-white/[0.22] hover:shadow-[0_0_24px_rgba(245,250,255,0.08)]",
            "active:scale-95",
            "disabled:opacity-36 disabled:cursor-not-allowed",
            "md:w-9 md:h-9 lg:w-11 lg:h-11",
          )}
        >
          {isPlaying ? (
            <Pause className="w-[18px] h-[18px] text-frost md:w-4 md:h-4 lg:w-[18px] lg:h-[18px]" />
          ) : (
            <Play className="w-[18px] h-[18px] text-frost ml-0.5 md:w-4 md:h-4 lg:w-[18px] lg:h-[18px]" />
          )}
        </button>
      </div>

      {/* Center zone: NOW PLAYING + track name + progress */}
      <div className="flex-1 min-w-[280px] flex flex-col items-center -mt-4 md:min-w-0 md:-mt-2 lg:min-w-[280px] lg:-mt-4">
        {currentTrack ? (
          <>
            <div className="flex flex-col items-center mb-0.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-brass/80 mb-0.5 hidden lg:block">
                Now Playing
              </span>
              <div className="text-[13px] leading-4 font-medium text-frost truncate text-center max-w-[200px] md:text-[11px] md:max-w-[140px] lg:text-[13px] lg:max-w-none">
                {currentTrack.display_name}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full mt-4 md:mt-2 md:gap-1 lg:mt-4 lg:gap-2">
              <span className="font-mono text-[11px] text-frost/52 w-10 text-right shrink-0 md:text-[10px] md:w-8 lg:text-[11px] lg:w-10">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative flex items-center h-5 -my-1.5 cursor-pointer group"
                onClick={(e) => {
                  if (!isHost) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const pct = x / rect.width;
                  onSeek(pct * duration);
                }}
              >
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] rounded-full bg-white/[0.10]">
                  <div
                    className="h-full rounded-full bg-soft transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-frost opacity-0 group-hover:opacity-100 transition-opacity timeline-thumb"
                    style={{ left: `${progress}%`, marginLeft: -4 }}
                  />
                </div>
              </div>
              <span className="font-mono text-[11px] text-frost/52 w-10 shrink-0 md:text-[10px] md:w-8 lg:text-[11px] lg:w-10">
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
        <div className="w-[140px] shrink-0 flex items-center justify-end gap-2 md:w-auto md:gap-1 lg:w-[140px] lg:gap-2">
          <span className="text-[11px] text-soft/50 truncate max-w-[90px] hidden lg:block">
            {nextTrack.display_name}
          </span>
          <div className="flex flex-col items-end">
            <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-frost/32 leading-none mb-0.5 hidden lg:block">Next</span>
            <button onClick={onNext} disabled={!isHost} className="p-0.5 rounded hover:bg-white/[0.06] transition-colors disabled:opacity-30">
              <SkipForward className="w-3.5 h-3.5 text-frost/40" />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-[60px] shrink-0 md:w-[44px] lg:w-[60px]" />
      )}
    </div>
  );
}
