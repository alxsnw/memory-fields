"use client"

import { cn } from "@/lib/utils"

interface NowPlayingTrack {
  display_name: string
  duration: number
}

interface NowPlayingProps {
  track: NowPlayingTrack | null
  currentTime: number
  isPlaying: boolean
  scrollToTrack?: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function NowPlaying({ track, currentTime, isPlaying, scrollToTrack }: NowPlayingProps) {
  return (
    <div
      onClick={scrollToTrack}
      className={cn(
        "h-[72px] rounded-2xl p-3 border border-brass/18 border-l-2 border-l-brass cursor-pointer",
        "transition-colors duration-200 hover:bg-brass/[0.10]",
        !track && "flex flex-col justify-center",
      )}
      style={{ backgroundColor: "rgba(166, 138, 99, 0.07)" }}
    >
      <p
        className="text-brass uppercase tracking-[0.08em] mb-1"
        style={{ fontFamily: '"IBM Plex Mono", "SF Mono", "Roboto Mono", monospace', fontSize: 9, lineHeight: "12px", fontWeight: 400 }}
      >
        NOW PLAYING
      </p>

      {track ? (
        <div className="flex flex-col gap-0.5">
          <p
            className="text-frost truncate"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", fontSize: 13, lineHeight: "16px", fontWeight: 500 }}
          >
            {track.display_name}
          </p>
          <p
            className="text-frost/46"
            style={{ fontFamily: '"IBM Plex Mono", "SF Mono", "Roboto Mono", monospace', fontSize: 11, lineHeight: "14px", fontWeight: 400 }}
          >
            {formatTime(currentTime)} / {formatTime(track.duration)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <p
            className="text-frost"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", fontSize: 13, lineHeight: "16px", fontWeight: 400 }}
          >
            No signal loaded
          </p>
          <p
            className="text-frost/46"
            style={{ fontFamily: '"IBM Plex Mono", "SF Mono", "Roboto Mono", monospace', fontSize: 11, lineHeight: "14px", fontWeight: 400 }}
          >
            Upload audio to activate the field
          </p>
        </div>
      )}
    </div>
  )
}
