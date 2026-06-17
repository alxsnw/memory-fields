"use client";

import { cn } from "@/lib/utils";
import { Archive } from "lucide-react";
import type { Track } from "@/types";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TrackRowProps {
  track: Track;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  isHost: boolean;
  isArchived: boolean;
  onClick: () => void;
  onArchive?: () => void;
}

export function TrackRow({ track, index, isSelected, isPlaying, isHost, isArchived, onClick, onArchive }: TrackRowProps) {
  return (
    <button
      onClick={isHost && track.status === "ready" ? onClick : undefined}
      className={cn(
        "w-full h-12 rounded-2xl px-3 flex items-center text-left relative overflow-hidden transition-all duration-300",
        "border",
        isPlaying && "bg-brass/9 border-brass/26",
        isSelected && !isPlaying && "bg-mineral/10 border-mineral/24",
        !isSelected && !isPlaying && "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.10]",
        isHost && track.status === "ready" && "cursor-pointer",
        !isHost && "cursor-default",
      )}
      style={{ animation: 'track-slide-in 300ms ease-out forwards', opacity: 0 }}
    >
      {(isPlaying || isSelected) && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[2px]",
            isPlaying ? "bg-brass" : "bg-mineral",
          )}
        />
      )}

      {/* Index */}
      <span className={cn(
        "font-mono text-[11px] w-6 shrink-0",
        isPlaying ? "text-brass" : "text-frost/30",
      )}>
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Playing indicator */}
      {isPlaying && (
        <span className="w-3 h-3 shrink-0 mr-1.5 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
        </span>
      )}

      {/* Title */}
      <span className="font-sans text-[12px] leading-4 font-medium text-soft truncate flex-1 min-w-0">
        {track.display_name}
      </span>

      {/* Duration */}
      <span className="font-mono text-[10px] text-frost/30 shrink-0 ml-2">
        {formatDuration(track.duration)}
      </span>

      {/* Archive action */}
      {isHost && track.status === "ready" && !isArchived && (
        <button
          onClick={(e) => { e.stopPropagation(); onArchive?.(); }}
          className="ml-2 flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-[0.06em] text-frost/30 hover:text-cyan/60 hover:bg-white/[0.04] transition-colors shrink-0"
          title="Make Imprint"
        >
          <Archive className="w-2.5 h-2.5" />
          Imprint
        </button>
      )}

      {/* Archived badge */}
      {isArchived && (
        <span className="ml-2 text-[8px] font-mono uppercase tracking-[0.08em] text-cyan/40 shrink-0">
          Archived
        </span>
      )}
    </button>
  );
}
