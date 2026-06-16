"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/flac", "audio/x-flac", "audio/x-m4a", "audio/aac"]
const MAX_SIZE = 100 * 1024 * 1024

interface UploadCapsuleProps {
  onUpload: (file: File) => void
  uploading: boolean
  progress: number
}

export default function UploadCapsule({ onUpload, uploading, progress }: UploadCapsuleProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

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
    const file = e.target.files?.[0]
    if (file) handleFile(file)
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
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-cyan/10 via-violet/10 to-transparent",
          uploading ? "opacity-60" : "opacity-40",
        )}
        style={{ animation: "plasma-drift 14s ease-in-out infinite" }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent rounded-capsule pointer-events-none" />

      <div className="absolute inset-0 flex items-center justify-center gap-2">
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
          {uploading ? `Uploading ${progress}%` : "Upload Audio"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
