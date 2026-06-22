"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/flac", "audio/x-flac", "audio/x-m4a", "audio/aac"]
const MAX_SIZE = 100 * 1024 * 1024

interface UploadCapsuleProps {
  onUpload: (file: File) => void
  uploading: boolean
  progress: number
  multi?: boolean
}

export default function UploadCapsule({ onUpload, uploading, progress, multi }: UploadCapsuleProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const isDeterminate = uploading && progress > 0 && progress < 100
  const sweepDuration = uploading ? (isDeterminate ? 2.5 : 1.5) : (isHovering ? 4 : 8)

  function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type) && !/\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name)) {
      return
    }
    if (file.size > MAX_SIZE) {
      return
    }
    onUpload(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        handleFile(files[i])
      }
    }
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={uploading ? -1 : 0}
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "relative w-full h-14 rounded-capsule overflow-hidden cursor-pointer select-none",
        "border transition-all duration-300",
        dragOver
          ? "border-white/30 bg-white/[0.07]"
          : uploading
            ? "border-white/[0.14] bg-white/[0.06]"
            : "border-white/[0.10] bg-white/[0.04]",
        !uploading && "hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.985]",
      )}
    >
      {/* Laser sweep beam */}
      <div className="absolute inset-0 overflow-hidden rounded-capsule pointer-events-none">
        <div
          className="absolute top-0 bottom-0 w-[35%] skew-x-[-18deg] blur-[8px] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(120,223,255,0) 10%, rgba(120,223,255,0.18) 35%, rgba(244,246,250,0.35) 50%, rgba(167,139,250,0.20) 65%, transparent 100%)",
            animationName: "laser-sweep",
            animationDuration: `${sweepDuration}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            opacity: uploading || isHovering ? 1 : 0.6,
            transition: "opacity 300ms ease",
          }}
        />
      </div>

      {/* Progress fill layer */}
      {uploading && progress > 0 && (
        <div
          className="absolute inset-y-0 left-0 rounded-capsule pointer-events-none"
          style={{
            width: `${Math.min(100, progress)}%`,
            background:
              "linear-gradient(90deg, rgba(120,223,255,0.10), rgba(120,223,255,0.18), rgba(167,139,250,0.16))",
          }}
        />
      )}

      {/* Inner top highlight */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent rounded-capsule pointer-events-none" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
        {!uploading && (
          <Upload size={12} className="text-frost/60" />
        )}
        <span
          className={cn(
            "text-frost/86 uppercase",
            !uploading && "tracking-[0.14em]",
          )}
          style={{
            fontFamily: '"IBM Plex Mono", "SF Mono", "Roboto Mono", monospace',
            fontSize: 10,
            lineHeight: "12px",
            fontWeight: 500,
            letterSpacing: uploading ? "0.06em" : "0.14em",
          }}
        >
          {uploading ? `Uploading ${progress}%` : (multi ? "Upload Audio" : "Upload Audio")}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
