"use client";

import { useRef, useEffect } from "react";
import { TrackRow } from "./track-row";
import type { Track } from "@/types";

interface MemoryArchiveProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  isHost: boolean;
  onSelectTrack: (track: Track) => void;
}

export function MemoryArchive({ tracks, currentTrackId, isPlaying, isHost, onSelectTrack }: MemoryArchiveProps) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 mb-3 flex items-center justify-between">
        <span className="font-sans text-[13px] leading-4 font-medium text-soft">Memory Archive</span>
        <span className="font-mono text-[10px] leading-[13px] uppercase text-frost/38">
          {tracks.length} {tracks.length === 1 ? "TRACK" : "TRACKS"}
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1"
      >
        {tracks.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
              No memories yet
            </p>
            <p className="font-mono text-[10px] text-subtle mt-1">
              Saved sessions will appear here
            </p>
          </div>
        ) : (
          tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              isSelected={track.id === currentTrackId}
              isPlaying={track.id === currentTrackId && isPlaying}
              isHost={isHost}
              onClick={() => onSelectTrack(track)}
            />
          ))
        )}
      </div>
    </div>
  );
}
