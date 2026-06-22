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
  { value: "noise-memory", label: "Noise Memory", enabled: true },
  { value: "latent-flow", label: "Latent Flow", enabled: true },
  { value: "archive-decoder", label: "Archive Decoder", enabled: true },
  { value: "ascii-field", label: "ASCII Field", enabled: true },
  { value: "orbital-spectrum", label: "Orbital Spectrum", enabled: true },
  { value: "spectral-grid", label: "Spectral Grid", enabled: true },
  { value: "topographic-wave", label: "Topographic Wave", enabled: true },
  { value: "pulse-field", label: "Pulse Field", enabled: true },
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

const scale = (v: number | undefined) => Math.round((v ?? 0) * 100);
const unscale = (v: number) => v / 100;

type Preset = "calm" | "balanced" | "intense";

const PRESET_LABELS: Record<Preset, string> = { calm: "Calm", balanced: "Balanced", intense: "Intense" };

// Per-mode preset mappings. Each preset overrides the mode-specific sliders.
const MODE_PRESETS: Record<string, Record<Preset, Partial<VisualParams> & { _preset?: string }>> = {
  "spatial-rhythm": {
    calm:     { density: 0.3, speed: 0.3, randomness: 0.2, memory: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, speed: 0.8, randomness: 0.7, memory: 0.6, _preset: "intense" },
  },
  "signal-field": {
    calm:     { density: 0.3, speed: 0.3, detail: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, speed: 0.8, detail: 0.8, _preset: "intense" },
  },
  "particle-memory": {
    calm:     { density: 0.3, speed: 0.3, memory: 0.5, randomness: 0.2, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, speed: 0.8, memory: 0.8, randomness: 0.7, _preset: "intense" },
  },
  "noise-memory": {
    calm:     { density: 0.3, speed: 0.3, memory: 0.5, randomness: 0.2, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, speed: 0.8, memory: 0.8, randomness: 0.7, _preset: "intense" },
  },
  "latent-flow": {
    calm:     { density: 0.3, speed: 0.3, glow: 0.3, randomness: 0.2, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, speed: 0.8, glow: 0.7, randomness: 0.7, _preset: "intense" },
  },
  "archive-decoder": {
    calm:     { density: 0.3, randomness: 0.1, speed: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, randomness: 0.7, speed: 0.8, _preset: "intense" },
  },
  "ascii-field": {
    calm:     { density: 0.3, randomness: 0.2, detail: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, randomness: 0.7, detail: 0.8, _preset: "intense" },
  },
  "orbital-spectrum": {
    calm:     { density: 0.3, randomness: 0.2, speed: 0.3, glow: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, randomness: 0.7, speed: 0.8, glow: 0.7, _preset: "intense" },
  },
  "spectral-grid": {
    calm:     { density: 0.3, speed: 0.3, glow: 0.3, memory: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, speed: 0.8, glow: 0.7, memory: 0.6, _preset: "intense" },
  },
  "topographic-wave": {
    calm:     { density: 0.3, speed: 0.3, memory: 0.3, glow: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, speed: 0.8, memory: 0.6, glow: 0.7, _preset: "intense" },
  },
  "pulse-field": {
    calm:     { density: 0.3, randomness: 0.2, speed: 0.3, memory: 0.3, _preset: "calm" },
    balanced: { _preset: "balanced" },
    intense:  { density: 0.8, randomness: 0.7, speed: 0.8, memory: 0.6, _preset: "intense" },
  },
};

function getCurrentPreset(visualParams: VisualParams, visualModel: VisualModel): Preset {
  const stored = (visualParams as any)._preset;
  if (stored === "calm" || stored === "intense") return stored;
  return "balanced";
}

export function FieldControls({
  visualModel, paletteMode, visualParams, isHost,
  onModelChange, onPaletteChange, onParamChange, onLiveParamChange, onMutate, onExport,
}: FieldControlsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const currentPreset = getCurrentPreset(visualParams, visualModel);

  const handlePreset = (preset: Preset) => {
    const modePresets = MODE_PRESETS[visualModel];
    if (!modePresets) return;
    const values = modePresets[preset];
    onParamChange(values);
  };

  // Model-specific sliders for Advanced section
  const renderAdvancedSliders = () => {
    const sliders: React.ReactNode[] = [];
    const add = (label: string, param: keyof VisualParams, opts?: { disabled?: boolean }) => {
      sliders.push(
        <FieldSlider key={param} label={label} value={scale(visualParams[param] as number | undefined)}
          onChange={(v) => onParamChange({ [param]: unscale(v) } as any)}
          onLiveChange={(v) => onLiveParamChange?.({ [param]: unscale(v) } as any)}
          disabled={opts?.disabled}
        />
      );
    };

    switch (visualModel) {
      case "signal-field":
        add("Core Trace", "coreTraceAmount"); add("Density", "density"); add("Speed", "speed"); add("Contrast", "detail");
        break;
      case "spatial-rhythm":
        add("Density", "density"); add("Speed", "speed"); add("Tension", "randomness"); add("Pulse", "memory");
        break;
      case "particle-memory":
        add("Density", "density"); add("Speed", "speed"); add("Memory", "memory"); add("Flow", "randomness");
        break;
      case "noise-memory":
        add("Density", "density"); add("Speed", "speed"); add("Memory", "memory"); add("Drift", "randomness");
        break;
      case "latent-flow":
        add("Density", "density"); add("Speed", "speed"); add("Glow", "glow"); add("Drift", "randomness");
        break;
      case "archive-decoder":
        add("Reconstruction", "density"); add("Corruption", "randomness"); add("Signal", "speed");
        break;
      case "ascii-field":
        add("Glyph", "density"); add("Distortion", "randomness"); add("Contrast", "detail");
        break;
      case "orbital-spectrum":
        add("Orbits", "density"); add("Gravity", "randomness"); add("Drift", "speed"); add("Glow", "glow");
        break;
      case "spectral-grid":
        add("Density", "density"); add("Speed", "speed"); add("Glow", "glow"); add("Memory", "memory");
        break;
      case "topographic-wave":
        add("Density", "density"); add("Speed", "speed"); add("Memory", "memory"); add("Glow", "glow");
        break;
      case "pulse-field":
        add("Density", "density"); add("Energy", "randomness"); add("Ripple", "speed"); add("Shockwave", "memory");
        break;
    }
    // Global: Archive + Glitch
    add("Archive", "vhsAmount");
    add("Glitch", "glitchAmount");
    return sliders;
  };
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

        {/* Preset */}
        <div className="border-b border-white/[0.06] pb-3 mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle mb-2">Preset</div>
          <div className="flex gap-1.5">
            {(["calm", "balanced", "intense"] as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => isHost && handlePreset(p)}
                disabled={!isHost}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-[0.06em] transition-colors",
                  currentPreset === p
                    ? "bg-white/[0.06] border-white/[0.14] text-frost"
                    : "bg-white/[0.02] border-white/[0.06] text-subtle hover:bg-white/[0.04]",
                  !isHost && "opacity-60 cursor-not-allowed",
                )}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Render Style */}
        <div className="border-b border-white/[0.06] pb-3 mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle mb-2">Render Style</div>
          <div className="flex gap-1.5">
            {(["native", "ascii"] as const).map((style) => (
              <button
                key={style}
                onClick={() => isHost && onParamChange({ _renderStyle: style } as any)}
                disabled={!isHost}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-[0.06em] transition-colors",
                  ((visualParams as any)._renderStyle || "native") === style
                    ? "bg-white/[0.06] border-white/[0.14] text-frost"
                    : "bg-white/[0.02] border-white/[0.06] text-subtle hover:bg-white/[0.04]",
                  !isHost && "opacity-60 cursor-not-allowed",
                )}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced (collapsed) */}
        <Section title="Advanced" defaultOpen={false}>
          {renderAdvancedSliders()}
        </Section>

        {/* Hidden sections (kept for reference, not shown) */}
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
        {false && <Section title="Variation" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-subtle">Seed</span>
            <span className="font-mono text-[10px] text-frost/60">{visualParams.randomness}</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-[10px] font-mono" onClick={onMutate} disabled={!isHost}>
            <Shuffle className="w-3 h-3 mr-1.5" />
            Mutate Field
          </Button>
        </Section>}
        {false && <Section title="Export" defaultOpen={false}>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono" onClick={() => onExport("png")}>PNG</Button>
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono" onClick={() => onExport("jpeg")}>JPEG</Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono opacity-40" disabled>GIF</Button>
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-mono opacity-40" disabled>Video</Button>
          </div>
        </Section>}
      </div>
    </div>
  );
}
