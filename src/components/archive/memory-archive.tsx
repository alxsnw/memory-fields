"use client";

import { useRef } from "react";
import { TrackRow } from "./track-row";
import type { Track } from "@/types";
import { Archive } from "lucide-react";

interface MemoryArchiveProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  isHost: boolean;
  archivedTrackIds: Set<string>;
  onSelectTrack: (track: Track) => void;
  onArchive: (track: Track) => void;
}

export function MemoryArchive({ tracks, currentTrackId, isPlaying, isHost, archivedTrackIds, onSelectTrack, onArchive }: MemoryArchiveProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const loadedTracks = tracks.filter(t => !archivedTrackIds.has(t.id));
  const archivedTracks = tracks.filter(t => archivedTrackIds.has(t.id));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Loaded Signals */}
      <div className="shrink-0 mb-3 flex items-center justify-between">
        <span className="font-sans text-[13px] leading-4 font-medium text-soft">Loaded Signals</span>
        <span className="font-mono text-[10px] uppercase text-frost/30">
          {loadedTracks.length} {loadedTracks.length === 1 ? "TRACK" : "TRACKS"}
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1"
      >
        {loadedTracks.length === 0 && archivedTracks.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
              No signals yet
            </p>
            <p className="font-mono text-[10px] text-subtle mt-1">
              Upload a track to start
            </p>
          </div>
        ) : loadedTracks.length === 0 && archivedTracks.length > 0 ? (
          <div className="text-center py-12">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
              All signals archived
            </p>
            <p className="font-mono text-[10px] text-subtle mt-1">
              Upload new signals to queue
            </p>
          </div>
        ) : (
          loadedTracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              isSelected={track.id === currentTrackId}
              isPlaying={track.id === currentTrackId && isPlaying}
              isHost={isHost}
              isArchived={false}
              onClick={() => onSelectTrack(track)}
              onArchive={() => onArchive(track)}
            />
          ))
        )}
      </div>

      {/* Field Prints section */}
      {archivedTracks.length > 0 && (
        <div className="shrink-0 mt-4 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-2">
            <Archive className="w-3 h-3 text-cyan/40" />
            <span className="font-sans text-[11px] font-medium text-cyan/50 uppercase tracking-[0.06em]">
              Field Prints
            </span>
          </div>
          <div className="space-y-1">
            {archivedTracks.map((track, i) => (
              <div
                key={track.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <span className="font-mono text-[9px] text-cyan/30 w-4 shrink-0">{i + 1}</span>
                <span className="font-sans text-[11px] text-soft/60 truncate flex-1">{track.display_name}</span>
                <span className="font-mono text-[8px] text-cyan/30 uppercase">Archived</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
