"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldSlider } from "@/components/ui/field-slider";
import { Button } from "@/components/ui/button";
import type { VisualModel, PaletteMode, VisualParams } from "@/types";

const VISUAL_MODELS: { value: VisualModel; label: string; enabled: boolean }[] = [
  { value: "spatial-rhythm", label: "Spatial Rhythm", enabled: true },
  { value: "signal-field", label: "Signal Field", enabled: true },
  { value: "particle-memory", label: "Particle Memory", enabled: true },
  { value: "topographic-wave", label: "Topographic Wave", enabled: false },
  { value: "orbital-spectrum", label: "Orbital Spectrum", enabled: false },
  { value: "spectral-grid", label: "Spectral Grid", enabled: false },
  { value: "ascii-field", label: "ASCII Field", enabled: false },
];

interface FieldControlsProps {
  visualModel: VisualModel;
  paletteMode: PaletteMode;
  visualParams: VisualParams;
  isHost: boolean;
  onModelChange: (model: VisualModel) => void;
  onPaletteChange: (mode: PaletteMode) => void;
  onParamChange: (params: Partial<VisualParams>) => void;
  onLiveParamChange?: (params: Partial<VisualParams>) => void;
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

const scale = (v: number) => Math.round(v * 100);
const unscale = (v: number) => v / 100;

export function FieldControls({
  visualModel, paletteMode, visualParams, isHost,
  onModelChange, onPaletteChange, onParamChange, onLiveParamChange, onMutate, onExport,
}: FieldControlsProps) {
  return (
    <div className="h-full flex flex-col mt-8">
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
                onClick={() => m.enabled && isHost && onModelChange(m.value)}
                disabled={!m.enabled || !isHost}
                className={cn(
                  "text-left px-2.5 py-2 rounded-lg border text-[11px] font-mono leading-[14px] transition-colors duration-75",
                  visualModel === m.value
                    ? "bg-white/[0.06] border-white/[0.14] text-frost"
                    : m.enabled
                      ? "bg-white/[0.02] border-white/[0.06] text-subtle hover:bg-white/[0.05] hover:border-white/[0.10]"
                      : "bg-white/[0.01] border-white/[0.03] text-subtle/40 cursor-not-allowed",
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
          <FieldSlider label="Core Trace" value={scale(visualParams.coreTraceAmount)} onChange={(v) => onParamChange({ coreTraceAmount: unscale(v) })} onLiveChange={(v) => onLiveParamChange?.({ coreTraceAmount: unscale(v) })} />
          <FieldSlider label="Density" value={scale(visualParams.density)} onChange={(v) => onParamChange({ density: unscale(v) })} onLiveChange={(v) => onLiveParamChange?.({ density: unscale(v) })} />
          <FieldSlider label="Speed" value={scale(visualParams.speed)} onChange={(v) => onParamChange({ speed: unscale(v) })} onLiveChange={(v) => onLiveParamChange?.({ speed: unscale(v) })} disabled={visualModel !== "particle-memory"} />
        </Section>

        {/* Processing - hidden for now */}
        {false && <Section title="Processing" defaultOpen={false}>
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
            <FieldSlider label="Amount" value={scale(visualParams.smoothingAmount)} onChange={(v) => onParamChange({ smoothingAmount: unscale(v) })} />
          )}
          <FieldSlider label="Core Size" value={scale(visualParams.coreSize)} onChange={(v) => onParamChange({ coreSize: unscale(v) })} />
          <FieldSlider label="Expansion" value={scale(visualParams.expansion)} onChange={(v) => onParamChange({ expansion: unscale(v) })} />
          <FieldSlider label="Edge Reactivity" value={scale(visualParams.edgeReactivity)} onChange={(v) => onParamChange({ edgeReactivity: unscale(v) })} />
          <FieldSlider label="Center Bias" value={scale(visualParams.centerBias)} onChange={(v) => onParamChange({ centerBias: unscale(v) })} />
        </Section>}

        {/* Post-Processing - hidden for now */}
        {false && <Section title="Post-Processing" defaultOpen={false}>
          <FieldSlider label="Bloom" value={scale(visualParams.bloom)} onChange={(v) => onParamChange({ bloom: unscale(v) })} />
          <FieldSlider label="Grain" value={scale(visualParams.grain)} onChange={(v) => onParamChange({ grain: unscale(v) })} />
          {visualParams.grain > 0 && (
            <>
              <FieldSlider label="Grain Intensity" value={scale(visualParams.grainIntensity)} onChange={(v) => onParamChange({ grainIntensity: unscale(v) })} />
              <FieldSlider label="Grain Size" value={scale(visualParams.grainSize)} onChange={(v) => onParamChange({ grainSize: unscale(v) })} />
            </>
          )}
          <FieldSlider label="Chromatic" value={scale(visualParams.chromatic)} onChange={(v) => onParamChange({ chromatic: unscale(v) })} />
          <FieldSlider label="Scanlines" value={scale(visualParams.scanlines)} onChange={(v) => onParamChange({ scanlines: unscale(v) })} />
          <FieldSlider label="Vignette" value={scale(visualParams.vignette)} onChange={(v) => onParamChange({ vignette: unscale(v) })} />
          <FieldSlider label="CRT Curve" value={scale(visualParams.crtCurve)} onChange={(v) => onParamChange({ crtCurve: unscale(v) })} />
          <FieldSlider label="Phosphor" value={scale(visualParams.phosphor)} onChange={(v) => onParamChange({ phosphor: unscale(v) })} />
        </Section>}

        {/* Variation - hidden for now */}
        {false && <Section title="Variation" defaultOpen={false}>
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
        </Section>}

        {/* Export - hidden for now */}
        {false && <Section title="Export" defaultOpen={false}>
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
        </Section>}
      </div>
    </div>
  );
}
