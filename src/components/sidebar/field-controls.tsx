"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { VisualModel, PaletteMode, VisualParams } from "@/types";

const VISUAL_MODELS: { value: VisualModel; label: string }[] = [
  { value: "signal-field", label: "Signal Field" },
  { value: "spatial-rhythm", label: "Spatial Rhythm" },
  { value: "particle-memory", label: "Particle Memory" },
  { value: "topographic-wave", label: "Topographic Wave" },
  { value: "orbital-spectrum", label: "Orbital Spectrum" },
  { value: "spectral-grid", label: "Spectral Grid" },
  { value: "ascii-field", label: "ASCII Field" },
];

interface FieldControlsProps {
  visualModel: VisualModel;
  paletteMode: PaletteMode;
  visualParams: VisualParams;
  isHost: boolean;
  onModelChange: (model: VisualModel) => void;
  onPaletteChange: (mode: PaletteMode) => void;
  onParamChange: (params: Partial<VisualParams>) => void;
  onMutate: () => void;
  onExport: (format: "png" | "jpeg") => void;
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.06] pb-3 mb-3 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left mb-2"
      >
        {open ? <ChevronDown className="w-3 h-3 text-subtle" /> : <ChevronRight className="w-3 h-3 text-subtle" />}
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">{title}</span>
      </button>
      {open && <div className="space-y-2.5">{children}</div>}
    </div>
  );
}

function SliderControl({ label, value, onChange, min = 0, max = 100 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-subtle">{label}</span>
        <span className="font-mono text-[10px] text-frost/60">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[2px] appearance-none bg-white/[0.08] rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-frost/80
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-frost/80
          [&::-moz-range-thumb]:border-0"
      />
    </div>
  );
}

export function FieldControls({
  visualModel, paletteMode, visualParams, isHost,
  onModelChange, onPaletteChange, onParamChange, onMutate, onExport,
}: FieldControlsProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle mb-4">
        Field Controls
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        {/* Visual Model */}
        <Section title="Visual Model">
          <div className="grid grid-cols-2 gap-1.5">
            {VISUAL_MODELS.map((m) => (
              <button
                key={m.value}
                onClick={() => isHost && onModelChange(m.value)}
                disabled={!isHost}
                className={cn(
                  "text-left px-2.5 py-2 rounded-lg border text-[11px] font-mono leading-[14px] transition-colors",
                  visualModel === m.value
                    ? "bg-white/[0.06] border-white/[0.14] text-frost"
                    : "bg-white/[0.02] border-white/[0.06] text-subtle hover:bg-white/[0.05] hover:border-white/[0.10]",
                  !isHost && "opacity-60 cursor-not-allowed",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Field */}
        <Section title="Field">
          <div className="flex gap-2 mb-2">
            {(["mineral", "spectral"] as PaletteMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => isHost && onPaletteChange(mode)}
                disabled={!isHost}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-[0.06em] transition-colors",
                  paletteMode === mode
                    ? "bg-white/[0.06] border-white/[0.14] text-frost"
                    : "bg-white/[0.02] border-white/[0.06] text-subtle",
                  !isHost && "opacity-60 cursor-not-allowed",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <SliderControl label="Intensity" value={visualParams.intensity} onChange={(v) => onParamChange({ intensity: v })} />
          <SliderControl label="Density" value={visualParams.density} onChange={(v) => onParamChange({ density: v })} />
          <SliderControl label="Speed" value={visualParams.speed} onChange={(v) => onParamChange({ speed: v })} />
          <SliderControl label="Memory" value={visualParams.memory} onChange={(v) => onParamChange({ memory: v })} />
          <SliderControl label="Detail" value={visualParams.detail} onChange={(v) => onParamChange({ detail: v })} />
          <SliderControl label="Glow" value={visualParams.glow} onChange={(v) => onParamChange({ glow: v })} />
          <SliderControl label="Randomness" value={visualParams.randomness} onChange={(v) => onParamChange({ randomness: v })} />
        </Section>

        {/* Processing */}
        <Section title="Processing" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-subtle">Smoothing</span>
            <button
              onClick={() => isHost && onParamChange({ smoothing: !visualParams.smoothing })}
              disabled={!isHost}
              className={cn(
                "w-7 h-4 rounded-full border transition-colors relative",
                visualParams.smoothing ? "bg-brass/60 border-brass" : "bg-white/[0.08] border-white/[0.12]",
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-frost transition-transform",
                visualParams.smoothing ? "translate-x-3.5" : "translate-x-0.5",
              )} />
            </button>
          </div>
          {visualParams.smoothing && (
            <SliderControl label="Amount" value={visualParams.smoothingAmount} onChange={(v) => onParamChange({ smoothingAmount: v })} />
          )}
          <SliderControl label="Core Size" value={visualParams.coreSize} onChange={(v) => onParamChange({ coreSize: v })} />
          <SliderControl label="Expansion" value={visualParams.expansion} onChange={(v) => onParamChange({ expansion: v })} />
          <SliderControl label="Edge Reactivity" value={visualParams.edgeReactivity} onChange={(v) => onParamChange({ edgeReactivity: v })} />
          <SliderControl label="Center Bias" value={visualParams.centerBias} onChange={(v) => onParamChange({ centerBias: v })} />
        </Section>

        {/* Post-Processing */}
        <Section title="Post-Processing" defaultOpen={false}>
          <SliderControl label="Bloom" value={visualParams.bloom} onChange={(v) => onParamChange({ bloom: v })} />
          <SliderControl label="Grain" value={visualParams.grain} onChange={(v) => onParamChange({ grain: v })} />
          {visualParams.grain > 0 && (
            <>
              <SliderControl label="Grain Intensity" value={visualParams.grainIntensity} onChange={(v) => onParamChange({ grainIntensity: v })} />
              <SliderControl label="Grain Size" value={visualParams.grainSize} onChange={(v) => onParamChange({ grainSize: v })} />
            </>
          )}
          <SliderControl label="Chromatic" value={visualParams.chromatic} onChange={(v) => onParamChange({ chromatic: v })} />
          <SliderControl label="Scanlines" value={visualParams.scanlines} onChange={(v) => onParamChange({ scanlines: v })} />
          <SliderControl label="Vignette" value={visualParams.vignette} onChange={(v) => onParamChange({ vignette: v })} />
          <SliderControl label="CRT Curve" value={visualParams.crtCurve} onChange={(v) => onParamChange({ crtCurve: v })} />
          <SliderControl label="Phosphor" value={visualParams.phosphor} onChange={(v) => onParamChange({ phosphor: v })} />
        </Section>

        {/* Variation */}
        <Section title="Variation" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-subtle">Seed</span>
            <span className="font-mono text-[10px] text-frost/60">{visualParams.randomness}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[10px] font-mono"
            onClick={onMutate}
            disabled={!isHost}
          >
            <Shuffle className="w-3 h-3 mr-1.5" />
            Mutate Field
          </Button>
        </Section>

        {/* Export */}
        <Section title="Export" defaultOpen={false}>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono" onClick={() => onExport("png")}>
              PNG
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono" onClick={() => onExport("jpeg")}>
              JPEG
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono opacity-40" disabled>
              GIF
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono opacity-40" disabled>
              Video
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
