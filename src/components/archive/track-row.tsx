"use client";

import { cn } from "@/lib/utils";
import type { Track, TrackStatus } from "@/types";

const statusConfig: Record<TrackStatus, { label: string; color: string }> = {
  uploading: { label: "UPLOADING", color: "text-brass" },
  processing: { label: "PROCESSING", color: "text-stone" },
  ready: { label: "READY", color: "text-success" },
  failed: { label: "FAILED", color: "text-error" },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TrackRowProps {
  track: Track;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  isHost: boolean;
  onClick: () => void;
}

export function TrackRow({ track, index, isSelected, isPlaying, isHost, onClick }: TrackRowProps) {
  const status = statusConfig[track.status];

  return (
    <button
      onClick={isHost && track.status === "ready" ? onClick : undefined}
      className={cn(
        "w-full h-[68px] rounded-2xl px-3 py-[10px] flex flex-col justify-center gap-0.5 text-left relative overflow-hidden transition-colors",
        "border",
        isPlaying && "bg-brass/9 border-brass/26",
        isSelected && !isPlaying && "bg-mineral/10 border-mineral/24",
        !isSelected && !isPlaying && "bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.055] hover:border-white/[0.12]",
        isHost && track.status === "ready" && "cursor-pointer",
        !isHost && "cursor-default",
      )}
    >
      {(isPlaying || isSelected) && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[2px]",
            isPlaying ? "bg-brass" : "bg-mineral",
          )}
        />
      )}

      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] leading-[14px] text-frost/36 w-5 shrink-0">
          {index + 1}
        </span>
        <span className="font-sans text-[13px] leading-4 font-medium text-soft truncate flex-1">
          {track.display_name}
        </span>
      </div>

      <div className="flex items-center gap-3 pl-7">
        <span className="font-mono text-[10px] leading-[13px] text-frost/36">
          {formatDuration(track.duration)}
        </span>
        <span className="font-mono text-[10px] leading-[13px] text-frost/36">
          {formatSize(track.file_size)}
        </span>
        <span className="font-mono text-[9px] leading-3 uppercase tracking-[0.08em] text-frost/36">
          {track.uploaded_by_display_name}
        </span>
        <span className={cn("font-mono text-[9px] leading-3 uppercase tracking-[0.08em] ml-auto", status.color)}>
          {status.label}
          {track.status === "uploading" && ` ${Math.round(track.upload_progress)}%`}
        </span>
      </div>

      {track.status === "uploading" && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]">
          <div
            className="h-full bg-brass transition-all duration-300"
            style={{ width: `${track.upload_progress}%` }}
          />
        </div>
      )}
    </button>
  );
}
