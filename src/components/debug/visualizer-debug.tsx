"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pickCompatibleNext } from "@/lib/presets";
import type { JourneyState, InterpolatedState } from "@/lib/visual-journey";

function getAudioFeatures(analyser: AnalyserNode | null) {
  if (!analyser) return { rms: 0, bass: 0, mids: 0, highs: 0 };
  const freq = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freq);
  const bass = freq.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = freq.slice(4, 16).reduce((a, b) => a + b, 0) / (12 * 255);
  const highs = freq.slice(16).reduce((a, b) => a + b, 0) / (freq.length - 16) / 255;
  const time = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(time);
  const rms = Math.sqrt(time.reduce((s, v) => s + Math.pow((v - 128) / 128, 2), 0) / time.length);
  return { rms, bass, mids, highs };
}

interface VisualizerDebugProps {
  journey: JourneyState;
  interpolatedState: InterpolatedState;
  analyserNode: AnalyserNode | null;
  onNextPreset: () => void;
  onJumpTo: (target: number) => void;
  onCompleteTransition: () => void;
  onSetDuration: (ms: number) => void;
}

export function VisualizerDebug({
  journey,
  interpolatedState,
  analyserNode,
  onNextPreset,
  onJumpTo,
  onCompleteTransition,
  onSetDuration,
}: VisualizerDebugProps) {
  const [features, setFeatures] = useState({ rms: 0, bass: 0, mids: 0, highs: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      setFeatures(getAudioFeatures(analyserNode));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode]);

  const rawT = journey.transitionDuration > 0
    ? Math.min(100, ((Date.now() - journey.startTime) / journey.transitionDuration) * 100)
    : 0;

  return (
    <div className="space-y-3 font-mono text-[9px] text-frost/60">
      {/* Preset info */}
      <div>
        <div className="text-[8px] uppercase tracking-[0.1em] text-subtle mb-1.5">Preset Transition</div>
        <div className="flex items-center gap-1.5 text-frost/40">
          <span>{journey.startPreset}</span>
          <span className="text-frost/20">→</span>
          <span>{journey.targetPreset}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full bg-brass transition-all duration-300" style={{ width: `${rawT}%` }} />
          </div>
          <span className="text-[8px] text-frost/40 w-8 text-right">{rawT.toFixed(0)}%</span>
        </div>
      </div>

      {/* Interpolated state values */}
      <div>
        <div className="text-[8px] uppercase tracking-[0.1em] text-subtle mb-1">Interpolated State</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Value label="glow" value={interpolatedState.glow} />
          <Value label="blur" value={interpolatedState.blur} />
          <Value label="speed" value={interpolatedState.speed} />
          <Value label="density" value={interpolatedState.density} />
          <Value label="randomness" value={interpolatedState.randomness} />
          <Value label="audioSens" value={interpolatedState.audioSensitivity} />
          <Value label="bassSens" value={interpolatedState.bassSensitivity} />
          <Value label="midSens" value={interpolatedState.midSensitivity} />
          <Value label="highSens" value={interpolatedState.highSensitivity} />
          <Value label="colorDrift" value={interpolatedState.colorDrift} />
          <Value label="lineDensity" value={interpolatedState.lineDensity} />
          <Value label="fieldScale" value={interpolatedState.fieldScale} />
          <Value label="membrane" value={interpolatedState.membraneAmount} />
          <Value label="topography" value={interpolatedState.topographyAmount} />
          <Value label="particles" value={interpolatedState.particleAmount} />
          <Value label="grid" value={interpolatedState.gridAmount} />
        </div>
      </div>

      {/* Audio features */}
      <div>
        <div className="text-[8px] uppercase tracking-[0.1em] text-subtle mb-1">Audio</div>
        <div className="grid grid-cols-4 gap-1">
          <AudioMeter label="RMS" value={features.rms} color="bg-cyan" />
          <AudioMeter label="Bass" value={features.bass} color="bg-brass" />
          <AudioMeter label="Mids" value={features.mids} color="bg-mineral" />
          <AudioMeter label="Highs" value={features.highs} color="bg-violet" />
        </div>
      </div>

      {/* Controls */}
      <div>
        <div className="text-[8px] uppercase tracking-[0.1em] text-subtle mb-1.5">Controls</div>
        <div className="flex flex-wrap gap-1">
          <MiniButton onClick={onNextPreset}>Next</MiniButton>
          <MiniButton onClick={() => onJumpTo(25)}>25%</MiniButton>
          <MiniButton onClick={() => onJumpTo(50)}>50%</MiniButton>
          <MiniButton onClick={() => onJumpTo(75)}>75%</MiniButton>
          <MiniButton onClick={onCompleteTransition}>Complete</MiniButton>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <MiniButton onClick={() => onSetDuration(30_000)}>30s</MiniButton>
          <MiniButton onClick={() => onSetDuration(60_000)}>1m</MiniButton>
          <MiniButton onClick={() => onSetDuration(300_000)}>5m</MiniButton>
          <MiniButton onClick={() => onSetDuration(600_000)}>10m</MiniButton>
        </div>
      </div>

      {/* Palette */}
      <div>
        <div className="text-[8px] uppercase tracking-[0.1em] text-subtle mb-1">Palette</div>
        <div className="flex gap-1">
          {interpolatedState.palette.map((c, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border border-white/[0.1]"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Value({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-frost/30">{label}</span>
      <span className={cn(
        "font-mono tabular-nums",
        value > 0.6 ? "text-cyan/60" : value > 0.3 ? "text-frost/60" : "text-frost/40",
      )}>
        {value.toFixed(3)}
      </span>
    </div>
  );
}

function AudioMeter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[7px] uppercase tracking-[0.08em] text-frost/30">{label}</span>
      <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-100", color)}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
      <span className="text-[8px] text-frost/40">{value.toFixed(3)}</span>
    </div>
  );
}

function MiniButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-[0.06em] bg-white/[0.04] border border-white/[0.06] text-frost/50 hover:text-frost/80 hover:bg-white/[0.08] transition-colors"
    >
      {children}
    </button>
  );
}
