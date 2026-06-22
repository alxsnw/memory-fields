"use client";

import { useEffect, useRef, useCallback } from "react";
import type { InterpolatedState } from "@/lib/visual-journey";

type VisualMode = "signal-field" | "spatial-rhythm" | "particle-memory" | "noise-memory" | "latent-flow" | "archive-decoder" | "ascii-field" | "orbital-spectrum" | "spectral-grid" | "topographic-wave" | "pulse-field";

interface CanvasVisualizerProps {
  state: InterpolatedState;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  glitchAmount?: number;
  vhsAmount?: number;
  coreTraceAmount?: number;
  activeVisualMode?: VisualMode;
  prevVisualMode?: VisualMode;
  transitionProgress?: number;
  idleTransitionProgress?: number;
  paletteMode?: string;
  liveSliderRef?: { current: { coreTraceAmount?: number; density?: number; speed?: number } };
  benchRef?: { current: { dprOverride?: number } };
}

const FLOORS = {
  membraneAlpha: 0.08,
  particleAlpha: 0.06,
  topographyAlpha: 0.08,
  gridAlpha: 0.06,
  coreGlow: 0.2,
  lineAlpha: 0.08,
};

let __connCounter = 0;
const __srSmooth = { low: 0, prevRaw: 0 };
const __glitchState = { timer: 0, nextGlitch: 5, glitchTimer: 0, isGlitching: false, tearX: 0 };
const __srVariant = { mode: 0 };
if (typeof window !== "undefined") (window as any).__srVariant = __srVariant;
const __lfState = {
  time: 0,
  nodes: [] as { angle: number; radius: number; vAngle: number; vRadius: number; phase: number; targetConnections: number[] }[],
  connections: [] as { from: number; to: number; age: number }[],
  reconnectTimer: 0,
  env: 0,
};

interface RendererConfig {
  name: string;
  opacity: number;
  lineWidth: number;
  glow: number;
  accumDecay: number;
  densityScale: number;
  audioMapStrength: number;
  contrast: number;
  boost: number;
}

const signalFieldConfig: RendererConfig = {
  name: "signal-field",
  opacity: 1,
  lineWidth: 1.2,
  glow: 1.2,
  accumDecay: 0.985,
  densityScale: 1,
  audioMapStrength: 1.2,
  contrast: 1.3,
  boost: 1.8,
};

const spatialRhythmConfig: RendererConfig = {
  name: "spatial-rhythm",
  opacity: 1,
  lineWidth: 1,
  glow: 1,
  accumDecay: 0.985,
  densityScale: 1,
  audioMapStrength: 1,
  contrast: 1,
  boost: 1,
};

const particleMemoryConfig: RendererConfig = {
  name: "particle-memory",
  opacity: 1,
  lineWidth: 1,
  glow: 1,
  accumDecay: 0.92,
  densityScale: 1,
  audioMapStrength: 1,
  contrast: 1,
  boost: 1,
};

const noiseMemoryConfig: RendererConfig = {
  name: "noise-memory",
  opacity: 1,
  lineWidth: 1,
  glow: 1,
  accumDecay: 0.97,
  densityScale: 1,
  audioMapStrength: 1.5,
  contrast: 1,
  boost: 1,
};

const latentFlowConfig: RendererConfig = {
  name: "latent-flow",
  opacity: 1,
  lineWidth: 1,
  glow: 1,
  accumDecay: 0.97,
  densityScale: 1,
  audioMapStrength: 1.2,
  contrast: 1,
  boost: 1,
};

const archiveDecoderConfig: RendererConfig = {
  name: "archive-decoder",
  opacity: 1,
  lineWidth: 1,
  glow: 1,
  accumDecay: 0.96,
  densityScale: 1,
  audioMapStrength: 1,
  contrast: 1,
  boost: 1,
};

const asciiFieldConfig: RendererConfig = {
  name: "ascii-field",
  opacity: 1, lineWidth: 1, glow: 1, accumDecay: 0.97, densityScale: 1, audioMapStrength: 1, contrast: 1, boost: 1,
};

const orbitalSpectrumConfig: RendererConfig = {
  name: "orbital-spectrum",
  opacity: 1, lineWidth: 1, glow: 1, accumDecay: 0.97, densityScale: 1, audioMapStrength: 1, contrast: 1, boost: 1,
};

const spectralGridConfig: RendererConfig = {
  name: "spectral-grid",
  opacity: 1, lineWidth: 1, glow: 1, accumDecay: 0.98, densityScale: 1, audioMapStrength: 1, contrast: 1, boost: 1,
};

const topographicWaveConfig: RendererConfig = {
  name: "topographic-wave",
  opacity: 1, lineWidth: 1, glow: 1, accumDecay: 0.98, densityScale: 1, audioMapStrength: 1, contrast: 1, boost: 1,
};

const pulseFieldConfig: RendererConfig = {
  name: "pulse-field",
  opacity: 1, lineWidth: 1, glow: 1, accumDecay: 0.96, densityScale: 1, audioMapStrength: 1.5, contrast: 1, boost: 1,
};

const rendererConfigs: Record<string, RendererConfig> = {
  "signal-field": signalFieldConfig,
  "spatial-rhythm": spatialRhythmConfig,
  "particle-memory": particleMemoryConfig,
  "noise-memory": noiseMemoryConfig,
  "latent-flow": latentFlowConfig,
  "archive-decoder": archiveDecoderConfig,
  "ascii-field": asciiFieldConfig,
  "orbital-spectrum": orbitalSpectrumConfig,
  "spectral-grid": spectralGridConfig,
  "topographic-wave": topographicWaveConfig,
  "pulse-field": pulseFieldConfig,
};

interface ParticleState {
  x: number; y: number;
  homeX: number; homeY: number;
  vx: number; vy: number;
  freqBin: number;
  baseSize: number;
  brightness: number;
  activity: number;
  age: number;
  clusterId: number;
  phase: number;
  burstTimer: number;
  depth: number;
}

function getParticleCount(density: number): number {
  if (density < 0.33) return 250 + Math.round((density / 0.33) * 150);
  if (density < 0.66) return 400 + Math.round(((density - 0.33) / 0.33) * 600);
  return 1000 + Math.round(((density - 0.66) / 0.34) * 800);
}

function initializeParticles(count: number, w: number, h: number): ParticleState[] {
  const clusterCount = 4 + Math.floor(Math.random() * 3);
  const clusters = Array.from({ length: clusterCount }, () => ({
    cx: w * (0.15 + Math.random() * 0.7),
    cy: h * (0.15 + Math.random() * 0.7),
    spread: Math.min(w, h) * (0.04 + Math.random() * 0.1),
    depth: 0.3 + Math.random() * 0.7,
  }));

  const particles: ParticleState[] = [];
  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusterCount];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * cluster.spread;
    const homeX = cluster.cx + Math.cos(angle) * dist;
    const homeY = cluster.cy + Math.sin(angle) * dist;

    particles.push({
      x: homeX + (Math.random() - 0.5) * 20,
      y: homeY + (Math.random() - 0.5) * 20,
      homeX, homeY,
      vx: 0, vy: 0,
      freqBin: (i % 126) + 2,
      baseSize: 0.3 + Math.random() * 1.5,
      brightness: 0.2 + Math.random() * 0.6,
      activity: 0,
      age: 0,
      clusterId: i % clusterCount,
      phase: i * 97.3 % (Math.PI * 2),
      burstTimer: 0,
      depth: cluster.depth * (0.5 + Math.random() * 0.5),
    });
  }
  return particles;
}

export function CanvasVisualizer({ 
  state, 
  analyserNode, 
  isPlaying, 
  glitchAmount = 0, 
  vhsAmount = 0,
  coreTraceAmount = 1,
  activeVisualMode = "spatial-rhythm",
  prevVisualMode = "spatial-rhythm",
  transitionProgress = 1,
  idleTransitionProgress = 1,
  paletteMode = "mineral",
  liveSliderRef,
  benchRef,
}: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accumRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const traceRef = useRef(0);
  const glitchPhaseRef = useRef(0);
  const glitchEventRef = useRef(0);
  const particleMemRef = useRef<ParticleState[]>([]);
  const noiseMemRef = useRef({ grid: [] as { vx: number; vy: number }[][], time: 0, particles: [] as { x: number; y: number; vx: number; vy: number; age: number; seed: number; col: number; row: number }[] });
  const prevBassRef = useRef(0);
  const pmInitRef = useRef(false);
  const perfRef = useRef({ fps: 60, frameTimes: [] as number[], quality: 1, frames: 0 });
  const debugRef = useRef({ activeMode: "", fps: 60, avgFps: 60, frameTime: 0, renderTime: 0, dpr: 1, particleCount: 0, connectionCount: 0, layers: 0, modes: [] as string[], warning: "", cfgName: "", accumDecay: 0, globalAlpha: 1, boost: 1, contrast: 1, lineWidth: 1 });
  const connCountRef = useRef(0);
  const timingRef = useRef({
    audioAnalysis: [] as number[],
    particleUpdate: [] as number[],
    particleDraw: [] as number[],
    connectionsDraw: [] as number[],
    signalFieldDraw: [] as number[],
    spatialRhythmDraw: [] as number[],
    accumDraw: [] as number[],
    freshDraw: [] as number[],
    frameTotal: [] as number[],
  });
  const drawRef = useRef<() => void>(() => {});

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // FPS tracking
    const perf = perfRef.current;
    perf.frameTimes.push(performance.now());
    if (perf.frameTimes.length > 30) perf.frameTimes.shift();
    if (perf.frameTimes.length >= 2) {
      const elapsed = perf.frameTimes[perf.frameTimes.length - 1] - perf.frameTimes[0];
      perf.fps = Math.round((perf.frameTimes.length - 1) / (elapsed / 1000));
    }
    perf.frames++;

    // Adaptive quality
    if (perf.fps < 24 && perf.quality > 0.5) perf.quality = Math.max(0.5, perf.quality - 0.1);
    if (perf.fps > 50 && perf.quality < 1) perf.quality = Math.min(1, perf.quality + 0.1);

    const adapt = perf.quality;

    let accumCtx: CanvasRenderingContext2D | null = null;
    if (!accumRef.current) {
      accumRef.current = document.createElement("canvas");
    }
    const accum = accumRef.current;
    accum.width = canvas.width;
    accum.height = canvas.height;
    accumCtx = accum.getContext("2d");

    const w = canvas.width;
    const h = canvas.height;
    const now = performance.now() / 1000;
    const dt = now - timeRef.current;
    timeRef.current = now;

    // Clear main canvas
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#030405";
    ctx.fillRect(0, 0, w, h);

    // Use live slider value during drag for responsive feel
    const effCoreTrace = liveSliderRef?.current?.coreTraceAmount ?? coreTraceAmount;

    // Accumulation decay
    if (accumCtx && isPlaying) {
      traceRef.current += dt;
      
      const isTransitioning = transitionProgress < 1;
      
      // Particle Memory uses Core Trace to control trail persistence
      let decayRate: number;
      const cfg = rendererConfigs[activeVisualMode] || signalFieldConfig;
      if (activeVisualMode === "particle-memory" && !isTransitioning) {
        decayRate = cfg.accumDecay + effCoreTrace * 0.07;
      } else if (isTransitioning) {
        decayRate = 0.95;
      } else {
        decayRate = cfg.accumDecay;
      }
      debugRef.current.accumDecay = decayRate;
      
      accumCtx.globalAlpha = decayRate;
      accumCtx.drawImage(accum, 0, 0);
      accumCtx.globalAlpha = 1;
    }

    const tFrame = performance.now();

    if (analyserNode && isPlaying) {
      const tAudio = performance.now();
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;
      const bass = dataArray.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
      const mids = dataArray.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
      const highs = dataArray.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);
      const timings = timingRef.current;
      const tArr = timings.audioAnalysis;
      tArr.push(performance.now() - tAudio);
      if (tArr.length > 120) tArr.shift();

      // Calculate crossfade alphas using prevVisualMode for transitions
      const alphaFor = (mode: VisualMode): number => {
        if (transitionProgress >= 1) return mode === activeVisualMode ? 1 : 0;
        if (mode === activeVisualMode) return transitionProgress;
        if (mode === prevVisualMode) return 1 - transitionProgress;
        return 0;
      };

      const signalFieldAlpha = alphaFor("signal-field");
      const spatialRhythmAlpha = alphaFor("spatial-rhythm");
      const particleMemoryAlpha = alphaFor("particle-memory");
      const noiseMemoryAlpha = alphaFor("noise-memory");
      const latentFlowAlpha = alphaFor("latent-flow");
      const archiveDecoderAlpha = alphaFor("archive-decoder");
      const asciiFieldAlpha = alphaFor("ascii-field");
      const orbitalSpectrumAlpha = alphaFor("orbital-spectrum");
      const spectralGridAlpha = alphaFor("spectral-grid");
      const topographicWaveAlpha = alphaFor("topographic-wave");
      const pulseFieldAlpha = alphaFor("pulse-field");

      // Track which modes are actively rendering for crossfade validation
      const renderingModes: string[] = [];
      if (signalFieldAlpha > 0.01) renderingModes.push("signal-field");
      if (spatialRhythmAlpha > 0.01) renderingModes.push("spatial-rhythm");
      if (particleMemoryAlpha > 0.01) renderingModes.push("particle-memory");
      if (noiseMemoryAlpha > 0.01) renderingModes.push("noise-memory");
      if (latentFlowAlpha > 0.01) renderingModes.push("latent-flow");
      if (archiveDecoderAlpha > 0.01) renderingModes.push("archive-decoder");
      if (asciiFieldAlpha > 0.01) renderingModes.push("ascii-field");
      if (orbitalSpectrumAlpha > 0.01) renderingModes.push("orbital-spectrum");
      if (spectralGridAlpha > 0.01) renderingModes.push("spectral-grid");
      if (topographicWaveAlpha > 0.01) renderingModes.push("topographic-wave");
      if (pulseFieldAlpha > 0.01) renderingModes.push("pulse-field");
      debugRef.current.modes = renderingModes;
      debugRef.current.warning = renderingModes.length > 2 ? `WARNING: ${renderingModes.length} MODES` : "";

      // Debug info
      debugRef.current.activeMode = activeVisualMode;
      debugRef.current.fps = perf.fps;
      debugRef.current.particleCount = particleMemRef.current.length;
      debugRef.current.layers = (signalFieldAlpha > 0.01 ? 1 : 0) + (spatialRhythmAlpha > 0.01 ? 1 : 0) + (particleMemoryAlpha > 0.01 ? 1 : 0) + (noiseMemoryAlpha > 0.01 ? 1 : 0) + (latentFlowAlpha > 0.01 ? 1 : 0) + (archiveDecoderAlpha > 0.01 ? 1 : 0) + (asciiFieldAlpha > 0.01 ? 1 : 0) + (orbitalSpectrumAlpha > 0.01 ? 1 : 0) + (spectralGridAlpha > 0.01 ? 1 : 0) + (topographicWaveAlpha > 0.01 ? 1 : 0) + (pulseFieldAlpha > 0.01 ? 1 : 0);
      const currentCfg = rendererConfigs[activeVisualMode] || signalFieldConfig;
      debugRef.current.cfgName = currentCfg.name;
      debugRef.current.globalAlpha = currentCfg.opacity;
      debugRef.current.boost = currentCfg.boost;
      debugRef.current.contrast = currentCfg.contrast;
      debugRef.current.lineWidth = currentCfg.lineWidth;

      // Initialize/update Particle Memory state
      const tParticleUpdate = performance.now();
      if (particleMemoryAlpha > 0.01 || noiseMemoryAlpha > 0.01 || latentFlowAlpha > 0.01 || archiveDecoderAlpha > 0.01 || asciiFieldAlpha > 0.01 || orbitalSpectrumAlpha > 0.01 || spectralGridAlpha > 0.01 || topographicWaveAlpha > 0.01 || pulseFieldAlpha > 0.01 || signalFieldAlpha < 0.99 || spatialRhythmAlpha < 0.99) {
        const density = state.density;
        const pmCount = Math.round(getParticleCount(density) * adapt);
        const pmCurrent = particleMemRef.current.length;
        
        if (pmCurrent !== pmCount || !pmInitRef.current) {
          pmInitRef.current = true;
          particleMemRef.current = initializeParticles(pmCount, w, h);
        }
        
        // Update particle state each frame
        const bass = dataArray.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
        const mids = dataArray.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
        const highs = dataArray.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);
        const sensitivity = state.audioSensitivity;
        const speed = Math.max(0.1, state.speed);
        const density2 = state.density;
        const isMineral = paletteMode === "mineral";
        const flowMul = isMineral ? 0.7 : 1.3;
        const jitterMul = isMineral ? 0.5 : 1.5;

        // Kick detection
        const bassDeriv = (bass - prevBassRef.current) / Math.max(dt, 0.016);
        prevBassRef.current = bass;
        const isKick = bassDeriv > 1.8 && bass > 0.25;

        const particles = particleMemRef.current;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const val = dataArray[Math.min(p.freqBin, bufferLength - 1)] / 255;
          p.activity = val * 0.5 + bass * 0.3 + mids * 0.2;

          const dx = p.x - w / 2;
          const dy = p.y - h / 2;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const nx = dx / dist;
          const ny = dy / dist;

          // Flow: orbital
          const orbitStrength = 0.3 * flowMul * (1 - p.depth * 0.5);
          const flowVx = -ny * orbitStrength;
          const flowVy = nx * orbitStrength;

          // Bass: outward pressure
          const bassPush = bass * 2.0 * sensitivity * flowMul;
          const pushVx = nx * bassPush * (1 - p.depth * 0.3);
          const pushVy = ny * bassPush * (1 - p.depth * 0.3);

          // Mid: turbulence
          const turbScale = 2.0 + density2 * 2;
          const turbAngle = now * 0.12 * speed + p.x / w * turbScale + p.y / h * turbScale;
          const turbStr = (0.3 + mids * 1.2) * sensitivity * flowMul;
          const turbVx = Math.cos(turbAngle + p.phase) * turbStr * (1 - p.depth * 0.4);
          const turbVy = Math.sin(turbAngle * 0.7 + 1.3 + p.phase) * turbStr * (1 - p.depth * 0.4);

          // Home attraction
          const homeDx = p.homeX - p.x;
          const homeDy = p.homeY - p.y;
          const homeStr = 0.003 * (1 + p.depth * 0.5);

          // High jitter
          const jitter = highs * 2.0 * sensitivity * jitterMul * (0.5 + p.depth * 0.5);
          const jx = Math.sin(now * 2.5 + p.phase * 2) * jitter;
          const jy = Math.cos(now * 2.1 + p.phase * 1.7) * jitter;

          p.vx += (flowVx + pushVx + turbVx + homeDx * homeStr + jx) * dt * 60;
          p.vy += (flowVy + pushVy + turbVy + homeDy * homeStr + jy) * dt * 60;

          if (isKick) {
            const burstStr = 4.0 * sensitivity * (0.5 + bass * 0.5);
            p.vx += nx * burstStr;
            p.vy += ny * burstStr;
            p.burstTimer = 20;
            p.activity = 1;
          }
          if (p.burstTimer > 0) p.burstTimer--;

          const damp = isMineral ? 0.96 : 0.94;
          p.vx *= damp;
          p.vy *= damp;

          const dtScale = dt * 60 * speed * (1 - p.depth * 0.3);
          p.x += p.vx * dtScale;
          p.y += p.vy * dtScale;

          // Edge wrap
          if (p.x < -80) p.x = w + 80;
          if (p.x > w + 80) p.x = -80;
          if (p.y < -80) p.y = h + 80;
          if (p.y > h + 80) p.y = -80;

          p.homeX += Math.sin(now * 0.01 + p.phase) * 0.05;
          p.homeY += Math.cos(now * 0.008 + p.phase * 0.7) * 0.05;
        }
      }
      {
        const arr = timingRef.current.particleUpdate;
        arr.push(performance.now() - tParticleUpdate);
        if (arr.length > 120) arr.shift();
      }

      // Draw to accumulation canvas
      const tAccum = performance.now();
      if (accumCtx) {
        // Signal Field layers
        if (signalFieldAlpha > 0.01) {
          accumCtx.globalAlpha = Math.min(1, signalFieldAlpha * signalFieldConfig.boost);
          if (effCoreTrace > 0) {
            drawMembrane(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state, effCoreTrace);
          }
          drawTopography(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          drawParticles(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          drawGrid(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          drawCore(accumCtx, w, h, dataArray, bufferLength, avg, now, state);
          drawSignalField(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // Spatial Rhythm layers
        if (spatialRhythmAlpha > 0.01) {
          accumCtx.globalAlpha = spatialRhythmAlpha;
          drawSpatialRhythm(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // Particle Memory layers
        if (particleMemoryAlpha > 0.01) {
          accumCtx.globalAlpha = particleMemoryAlpha;
          drawParticleMemory(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state, particleMemRef.current, false, effCoreTrace);
          accumCtx.globalAlpha = 1;
        }

        // Noise Memory layers
        if (noiseMemoryAlpha > 0.01) {
          accumCtx.globalAlpha = noiseMemoryAlpha;
          drawNoiseMemory(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state, noiseMemRef.current);
          accumCtx.globalAlpha = 1;
        }

        // Latent Flow layers
        if (latentFlowAlpha > 0.01) {
          accumCtx.globalAlpha = latentFlowAlpha;
          drawLatentFlow(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // Archive Decoder layers
        if (archiveDecoderAlpha > 0.01) {
          accumCtx.globalAlpha = archiveDecoderAlpha;
          drawArchiveDecoder(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // ASCII Field layers
        if (asciiFieldAlpha > 0.01) {
          accumCtx.globalAlpha = asciiFieldAlpha;
          drawAsciiField(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // Orbital Spectrum layers
        if (orbitalSpectrumAlpha > 0.01) {
          accumCtx.globalAlpha = orbitalSpectrumAlpha;
          drawOrbitalSpectrum(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // Spectral Grid layers
        if (spectralGridAlpha > 0.01) {
          accumCtx.globalAlpha = spectralGridAlpha;
          drawSpectralGrid(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // Topographic Wave layers
        if (topographicWaveAlpha > 0.01) {
          accumCtx.globalAlpha = topographicWaveAlpha;
          drawTopographicWave(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }

        // Pulse Field layers
        if (pulseFieldAlpha > 0.01) {
          accumCtx.globalAlpha = pulseFieldAlpha;
          drawPulseField(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
          accumCtx.globalAlpha = 1;
        }
      }
      {
        const arr = timings.accumDraw;
        arr.push(performance.now() - tAccum);
        if (arr.length > 120) arr.shift();
      }

      // Draw accumulation to main canvas
      ctx.drawImage(accum, 0, 0);

      // Draw fresh layers on top
      const tFresh = performance.now();
      if (signalFieldAlpha > 0.01) {
        ctx.globalAlpha = Math.min(1, signalFieldAlpha * signalFieldConfig.boost);
        if (effCoreTrace > 0) {
          drawMembrane(ctx, w, h, dataArray, bufferLength, avg, now, dt, state, effCoreTrace);
        }
        drawTopography(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        drawParticles(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        drawGrid(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        drawCore(ctx, w, h, dataArray, bufferLength, avg, now, state);
        drawSignalField(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (spatialRhythmAlpha > 0.01) {
        ctx.globalAlpha = spatialRhythmAlpha;
        drawSpatialRhythm(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (particleMemoryAlpha > 0.01) {
        ctx.globalAlpha = particleMemoryAlpha;
        drawParticleMemory(ctx, w, h, dataArray, bufferLength, avg, now, dt, state, particleMemRef.current, true, effCoreTrace);
        ctx.globalAlpha = 1;
      }

      if (noiseMemoryAlpha > 0.01) {
        ctx.globalAlpha = noiseMemoryAlpha;
        drawNoiseMemory(ctx, w, h, dataArray, bufferLength, avg, now, dt, state, noiseMemRef.current);
        ctx.globalAlpha = 1;
      }

      if (latentFlowAlpha > 0.01) {
        ctx.globalAlpha = latentFlowAlpha;
        drawLatentFlow(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (archiveDecoderAlpha > 0.01) {
        ctx.globalAlpha = archiveDecoderAlpha;
        drawArchiveDecoder(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (asciiFieldAlpha > 0.01) {
        ctx.globalAlpha = asciiFieldAlpha;
        drawAsciiField(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (orbitalSpectrumAlpha > 0.01) {
        ctx.globalAlpha = orbitalSpectrumAlpha;
        drawOrbitalSpectrum(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (spectralGridAlpha > 0.01) {
        ctx.globalAlpha = spectralGridAlpha;
        drawSpectralGrid(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (topographicWaveAlpha > 0.01) {
        ctx.globalAlpha = topographicWaveAlpha;
        drawTopographicWave(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }

      if (pulseFieldAlpha > 0.01) {
        ctx.globalAlpha = pulseFieldAlpha;
        drawPulseField(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        ctx.globalAlpha = 1;
      }
      {
        const arr = timings.freshDraw;
        arr.push(performance.now() - tFresh);
        if (arr.length > 120) arr.shift();
      }
      debugRef.current.connectionCount = __connCounter;

      // Glitch + VHS pass
      if (glitchAmount > 0 || vhsAmount > 0) {
        drawGlitch(ctx, w, h, avg, now, glitchAmount, vhsAmount);
      }
    } else {
      // Idle state with transition
      const idleAlpha = idleTransitionProgress;
      const activeAlpha = 1 - idleTransitionProgress;

      // Gradual accumulation decay during idle transition
      if (accumCtx) {
        const decayRate = idleAlpha < 0.95 ? 0.95 : 0.985; // Faster decay during transition
        accumCtx.globalAlpha = decayRate;
        accumCtx.drawImage(accum, 0, 0);
        accumCtx.globalAlpha = 1;
      }

      if (activeAlpha > 0.01) {
        // Draw fading active visualizer using last known audio data or zeros
        const bufferLength = analyserNode?.frequencyBinCount || 128;
        const dataArray = new Uint8Array(bufferLength);
        
        // Try to get audio data, but continue even if analyserNode is null
        if (analyserNode) {
          try {
            analyserNode.getByteFrequencyData(dataArray);
          } catch (e) {
            // If analyser fails, use zeros (frozen frame effect)
          }
        }
        
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;

        // Draw accumulation to main canvas
        ctx.drawImage(accum, 0, 0);

        ctx.globalAlpha = Math.min(1, activeAlpha * signalFieldConfig.boost);
        if (activeVisualMode === "signal-field") {
          if (effCoreTrace > 0) {
            drawMembrane(ctx, w, h, dataArray, bufferLength, avg, now, dt, state, effCoreTrace);
          }
          drawTopography(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
          drawParticles(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
          drawGrid(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
          drawCore(ctx, w, h, dataArray, bufferLength, avg, now, state);
          drawSignalField(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else if (activeVisualMode === "particle-memory") {
          drawParticleMemory(ctx, w, h, dataArray, bufferLength, avg, now, dt, state, particleMemRef.current, true, effCoreTrace);
        } else if (activeVisualMode === "noise-memory") {
          drawNoiseMemory(ctx, w, h, dataArray, bufferLength, avg, now, dt, state, noiseMemRef.current);
        } else if (activeVisualMode === "latent-flow") {
          drawLatentFlow(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else if (activeVisualMode === "archive-decoder") {
          drawArchiveDecoder(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else if (activeVisualMode === "ascii-field") {
          drawAsciiField(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else if (activeVisualMode === "orbital-spectrum") {
          drawOrbitalSpectrum(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else if (activeVisualMode === "spectral-grid") {
          drawSpectralGrid(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else if (activeVisualMode === "topographic-wave") {
          drawTopographicWave(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else if (activeVisualMode === "pulse-field") {
          drawPulseField(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        } else {
          drawSpatialRhythm(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
        }
        ctx.globalAlpha = 1;
      }

      if (idleAlpha > 0.01) {
        ctx.globalAlpha = idleAlpha;
        drawIdleAura(ctx, w, h, now, state);
        drawCoreIdle(ctx, w, h, now, state);
        ctx.globalAlpha = 1;
      }

      // Only clear accumulation when fully transitioned to idle
      if (idleAlpha >= 0.99 && accumCtx) {
        accumCtx.clearRect(0, 0, w, h);
        traceRef.current = 0;
      }
    }

    // Frame total timing
    const frameT = performance.now() - tFrame;
    const ftArr = timingRef.current.frameTotal;
    ftArr.push(frameT);
    if (ftArr.length > 120) ftArr.shift();
    debugRef.current.frameTime = frameT;
    debugRef.current.renderTime = rollingAvg(ftArr);
    debugRef.current.avgFps = ftArr.length > 1 ? Math.round((ftArr.length - 1) / ((ftArr[ftArr.length - 1] - ftArr[0]) / 1000)) : 60;
  }, [state, analyserNode, isPlaying, glitchAmount, vhsAmount, coreTraceAmount, activeVisualMode, prevVisualMode, transitionProgress, idleTransitionProgress, paletteMode]);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Initialize timeRef to avoid huge first-frame dt
    timeRef.current = performance.now() / 1000;
    const resize = () => {
      const override = benchRef?.current?.dprOverride;
      const dpr = override || Math.min(window.devicePixelRatio || 1, 1.5);
      debugRef.current.dpr = dpr;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      if (accumRef.current) {
        accumRef.current.width = canvas.width;
        accumRef.current.height = canvas.height;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      drawRef.current();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ background: "#030405" }}
      />
      <div className="fixed top-20 right-4 z-50 font-mono text-[9px] text-frost/30 leading-[1.3] pointer-events-none select-none text-right">
        <div className="text-frost/50">{debugRef.current.activeMode.replace("-", " ")}</div>
        <div className="text-frost/20">cfg: {debugRef.current.cfgName} α:{debugRef.current.globalAlpha.toFixed(2)} boost:{debugRef.current.boost.toFixed(1)} ct:{debugRef.current.contrast.toFixed(1)} lw:{debugRef.current.lineWidth.toFixed(1)}</div>
        <div className="text-frost/20">dcy:{debugRef.current.accumDecay.toFixed(3)}</div>
        <div>{debugRef.current.fps}fps <span className="text-frost/20">avg {debugRef.current.avgFps}</span></div>
        <div className="text-frost/20">{debugRef.current.frameTime.toFixed(1)}ms / {debugRef.current.renderTime.toFixed(1)}ms</div>
        <div>dpr {debugRef.current.dpr.toFixed(1)}</div>
        {debugRef.current.particleCount > 0 && <div>{debugRef.current.particleCount}p / {debugRef.current.connectionCount}c</div>}
        <div className={debugRef.current.warning ? "text-red/60" : "text-frost/20"}>
          {debugRef.current.layers}lyr {debugRef.current.modes.join("+")}
        </div>
        {debugRef.current.warning && <div className="text-red/80 font-bold">{debugRef.current.warning}</div>}
        <div className="text-frost/20">q{perfRef.current.quality.toFixed(2)}</div>
      </div>
    </>
  );
}

function getColor(i: number, palette: string[], count: number): string {
  return palette[Math.floor((i / count) * palette.length) % palette.length];
}

function rollingAvg(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/* ── Idle aura (enhanced) ── */
function drawIdleAura(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, s: InterpolatedState) {
  const cx = w / 2;
  const cy = h / 2;
  const baseR = Math.min(w, h) * 0.22 * s.fieldScale;

  // Background glow
  const bgGr = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2.5);
  bgGr.addColorStop(0, s.palette[0] + "06");
  bgGr.addColorStop(0.5, s.palette[1 % s.palette.length] + "04");
  bgGr.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = bgGr;
  ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, 0.3);
  ctx.fill();

  // Orbiting lobes
  for (let i = 0; i < 5; i++) {
    const phase = now * (0.08 + s.speed * 0.06) + i * 1.26;
    const orbitR = baseR * (0.5 + Math.sin(now * 0.04 + i * 0.7) * 0.3);
    const x = cx + Math.cos(phase) * orbitR;
    const y = cy + Math.sin(phase * 0.7 + i) * orbitR * 0.7;
    const r = baseR * (0.3 + Math.sin(now * 0.06 + i * 1.1) * 0.15);

    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, s.palette[i % s.palette.length] + "18");
    gr.addColorStop(0.6, s.palette[(i + 1) % s.palette.length] + "0c");
    gr.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, 0.2 + Math.sin(now * 0.05 + i) * 0.06);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawCoreIdle(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, s: InterpolatedState) {
  const cx = w / 2;
  const cy = h / 2;
  const pulse = Math.sin(now * 0.3) * 0.5 + 0.5;
  const r = Math.min(w, h) * 0.04 * s.fieldScale * (0.6 + pulse * 0.4);
  const glow = Math.max(FLOORS.coreGlow, s.glow * 0.6);

  for (let i = 2; i >= 0; i--) {
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (1 + i * 0.8));
    gr.addColorStop(0, s.palette[0] + Math.floor(glow * 40 * (1 - i * 0.25)).toString(16).padStart(2, "0"));
    gr.addColorStop(0.5, s.palette[0] + Math.floor(glow * 20 * (1 - i * 0.3)).toString(16).padStart(2, "0"));
    gr.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1 + i * 0.8), 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, 0.4 - i * 0.12);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── Core ── */
function drawCore(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, s: InterpolatedState,
) {
  const cx = w / 2;
  const cy = h / 2;
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const pulse = Math.sin(now * 0.5) * 0.5 + 0.5;
  const coreSize = Math.min(w, h) * 0.04 * s.fieldScale * (0.5 + avg * 0.5 + bass * 0.3);
  const glow = Math.max(FLOORS.coreGlow, s.glow * (0.6 + avg * 0.4));

  for (let i = 2; i >= 0; i--) {
    const radius = coreSize * (1 + i * 0.7 + pulse * 0.15);
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const alpha = Math.floor(glow * 50 * (1 - i * 0.2)).toString(16).padStart(2, "0");
    gr.addColorStop(0, s.palette[0] + alpha);
    gr.addColorStop(0.4, s.palette[1 % s.palette.length] + Math.floor(parseInt(alpha, 16) * 0.6).toString(16).padStart(2, "0"));
    gr.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, 0.5 - i * 0.12);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── Signal Field fullscreen layer ── */
function drawSignalField(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  // Fullscreen brightness pulse driven by RMS
  const pulse = Math.max(0.1, avg * s.audioSensitivity * 0.3);
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);

  // Large signal ripples
  const rippleCount = 3 + Math.floor(s.density * 3);
  for (let r = 0; r < rippleCount; r++) {
    const phase = now * (0.15 + s.speed * 0.2) + r * 2.1;
    const rippleRadius = ((Math.sin(phase) * 0.5 + 0.5) * 0.6 + 0.2) * Math.max(w, h) * 0.5;
    const cx = w / 2 + Math.sin(now * 0.05 + r) * w * 0.08;
    const cy = h / 2 + Math.cos(now * 0.04 + r * 0.7) * h * 0.08;
    const width = 30 + bass * 60;

    const gr = ctx.createRadialGradient(cx, cy, rippleRadius - width, cx, cy, rippleRadius + width);
    gr.addColorStop(0, "transparent");
    gr.addColorStop(0.4, s.palette[r % s.palette.length] + Math.floor(8 + avg * 25).toString(16).padStart(2, "0"));
    gr.addColorStop(0.6, s.palette[(r + 1) % s.palette.length] + Math.floor(6 + avg * 18).toString(16).padStart(2, "0"));
    gr.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, rippleRadius + width, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, pulse * 0.5);
    ctx.fill();
  }

  // Screen-wide luminous sweep
  const sweepAngle = now * (0.03 + s.speed * 0.04);
  for (let i = 0; i < 3; i++) {
    const angle = sweepAngle + i * 2.1;
    const sx = w / 2 + Math.cos(angle) * Math.max(w, h) * 0.6;
    const sy = h / 2 + Math.sin(angle) * Math.max(w, h) * 0.6;
    const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.8);
    gr.addColorStop(0, s.palette[i % s.palette.length] + Math.floor(4 + highs * 20).toString(16).padStart(2, "0"));
    gr.addColorStop(1, "transparent");
    ctx.fillStyle = gr;
    ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, pulse * 0.25);
    ctx.fillRect(0, 0, w, h);
  }

  // High shimmer / sparks
  if (highs > 0.3) {
    const sparkCount = Math.floor(highs * 20);
    for (let i = 0; i < sparkCount; i++) {
      const seed = i * 73.7 + now * 0.5;
      const sx = ((Math.sin(seed) * 0.5 + 0.5) * 0.9 + 0.05) * w;
      const sy = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * 0.9 + 0.05) * h;
      const sr = 1 + highs * 3;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = s.palette[i % s.palette.length];
      ctx.globalAlpha = highs * 0.3;
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

/* ── Spatial Rhythm ── */
function drawSpatialRhythm(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);

  const vm = __srVariant.mode;

  // Variant A (1): Original baseline — pure frequency bins, no envelope
  if (vm === 1) {
    const waveCount1 = 5 + Math.floor(s.density * 8);
    for (let i = 0; i < waveCount1; i++) {
      const yBase = (h / waveCount1) * i;
      const amp1 = bass * 80 * s.audioSensitivity + mids * 40 * s.audioSensitivity;
      const freq1 = 0.01 + s.speed * 0.02;
      const ph1 = now * (0.3 + s.speed * 0.5) + i * 0.8;
      ctx.beginPath(); ctx.moveTo(0, yBase);
      for (let x = 0; x <= w; x += 4) {
        const wv = Math.sin(x * freq1 + ph1) * amp1;
        const sec = Math.sin(x * freq1 * 2.3 + ph1 * 1.5) * amp1 * 0.3;
        ctx.lineTo(x, yBase + wv + sec);
      }
      const a1 = Math.max(FLOORS.lineAlpha, 0.15 + bass * 0.3);
      ctx.strokeStyle = getColor(i, s.palette, waveCount1) + Math.floor(a1 * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.5 + bass * 2;
      ctx.stroke();
    }
    const arcCount1 = 3 + Math.floor(avg * 5);
    const cx1 = w / 2, cy1 = h / 2;
    for (let i = 0; i < arcCount1; i++) {
      const r1 = Math.min(w, h) * (0.15 + i * 0.12) * (1 + bass * 0.5);
      const sa1 = now * (0.2 + s.speed * 0.3) + i * 1.2;
      const sw1 = Math.PI * (0.3 + mids * 0.4);
      ctx.beginPath(); ctx.arc(cx1, cy1, r1, sa1, sa1 + sw1);
      const a1 = Math.max(FLOORS.lineAlpha, 0.1 + avg * 0.25);
      ctx.strokeStyle = s.palette[i % s.palette.length] + Math.floor(a1 * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1 + mids * 2;
      ctx.stroke();
    }
    const pc1 = Math.floor(20 + s.density * 40);
    for (let i = 0; i < pc1; i++) {
      const sd = i * 97.3;
      const bx = (Math.sin(sd + now * 0.1) * 0.5 + 0.5) * w;
      const by = (Math.cos(sd * 1.3 + now * 0.08) * 0.5 + 0.5) * h;
      const dr = bass * 30 * s.audioSensitivity;
      const px = bx + Math.sin(now * 0.5 + sd) * dr;
      const py = by + Math.cos(now * 0.4 + sd * 1.2) * dr;
      ctx.beginPath(); ctx.arc(px, py, 1 + highs * 3, 0, Math.PI * 2);
      ctx.fillStyle = getColor(i, s.palette, pc1);
      ctx.globalAlpha = Math.max(FLOORS.particleAlpha, 0.15 + highs * 0.4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }

  // Variant B (2): Low-end envelope v1 — moderate __lowEnergy drive
  if (vm === 2) {
    const lo2 = Math.min(1, bass * 1.5);
    const sr2 = __srSmooth;
    sr2.low += (lo2 - sr2.low) * (lo2 > sr2.low ? 0.35 : 0.06);
    const drive2 = Math.min(1, bass + sr2.low * 0.5);
    const wc2 = 5 + Math.floor(s.density * 8);
    for (let i = 0; i < wc2; i++) {
      const yb = (h / wc2) * i;
      const amp2 = drive2 * 120 * s.audioSensitivity + mids * 40 * s.audioSensitivity;
      const freq2 = 0.01 + s.speed * 0.02;
      const ph2 = now * (0.3 + s.speed * 0.5) + i * 0.8;
      ctx.beginPath(); ctx.moveTo(0, yb);
      for (let x = 0; x <= w; x += 4) {
        const wv = Math.sin(x * freq2 + ph2) * amp2;
        ctx.lineTo(x, yb + wv);
      }
      const a2 = Math.max(FLOORS.lineAlpha, 0.15 + drive2 * 0.4);
      ctx.strokeStyle = getColor(i, s.palette, wc2) + Math.floor(a2 * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.5 + drive2 * 3;
      ctx.stroke();
    }
    const ac2 = 3 + Math.floor(avg * 5);
    const cx2 = w / 2, cy2 = h / 2;
    for (let i = 0; i < ac2; i++) {
      const r2 = Math.min(w, h) * (0.15 + i * 0.12) * (1 + drive2 * 0.8);
      const sa2 = now * (0.2 + s.speed * 0.3) + i * 1.2;
      const sw2 = Math.PI * (0.3 + mids * 0.4);
      ctx.beginPath(); ctx.arc(cx2, cy2, r2, sa2, sa2 + sw2);
      const a2 = Math.max(FLOORS.lineAlpha, 0.1 + avg * 0.25 + drive2 * 0.2);
      ctx.strokeStyle = s.palette[i % s.palette.length] + Math.floor(a2 * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1 + mids * 2 + drive2 * 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  // Variant C (3): Aggressive drive — strong multipliers
  if (vm === 3) {
    const lo3 = Math.min(1, bass * 3);
    const sr3 = __srSmooth;
    sr3.low += (lo3 - sr3.low) * (lo3 > sr3.low ? 0.4 : 0.08);
    const kick3 = Math.max(0, lo3 - sr3.prevRaw) * 4;
    sr3.prevRaw = lo3;
    const drive3 = Math.min(1, bass + sr3.low * 1.5 + kick3 * 0.8);
    const wc3 = 5 + Math.floor(s.density * 8);
    for (let i = 0; i < wc3; i++) {
      const yb = (h / wc3) * i;
      const amp3 = drive3 * 200 * s.audioSensitivity + mids * 60 * s.audioSensitivity;
      const freq3 = 0.01 + s.speed * 0.02;
      const ph3 = now * (0.3 + s.speed * 0.5) + i * 0.8;
      ctx.beginPath(); ctx.moveTo(0, yb);
      for (let x = 0; x <= w; x += 4) {
        ctx.lineTo(x, yb + Math.sin(x * freq3 + ph3) * amp3);
      }
      const a3 = Math.max(FLOORS.lineAlpha, 0.15 + drive3 * 1.0);
      ctx.strokeStyle = getColor(i, s.palette, wc3) + Math.floor(a3 * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.5 + drive3 * 6;
      ctx.stroke();
    }
    const ac3 = 3 + Math.floor(avg * 5 + sr3.low * 3);
    const cx3 = w / 2, cy3 = h / 2;
    for (let i = 0; i < ac3; i++) {
      const r3 = Math.min(w, h) * (0.15 + i * 0.12) * (1 + drive3 * 1.5 + kick3 * 1.5);
      const sa3 = now * (0.2 + s.speed * 0.3) + i * 1.2 + kick3;
      const sw3 = Math.PI * (0.3 + mids * 0.4 + drive3 * 0.2);
      ctx.beginPath(); ctx.arc(cx3, cy3, r3, sa3, sa3 + sw3);
      const a3 = Math.max(FLOORS.lineAlpha, 0.1 + avg * 0.25 + kick3 * 0.5);
      ctx.strokeStyle = s.palette[i % s.palette.length] + Math.floor(a3 * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1 + mids * 2 + kick3 * 3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  // Variant 0 (Current): v3 with breathing + time reduction
  const lowRaw = Math.min(1, bass * 2.5);
  const sr = __srSmooth;
  sr.low += (lowRaw - sr.low) * (lowRaw > sr.low ? 0.4 : 0.08);
  const kickPulse = Math.max(0, lowRaw - sr.prevRaw) * 3;
  sr.prevRaw = lowRaw;

  const audioWeight = Math.min(1, avg * 4);
  const timePhase = now * (0.08 + s.speed * 0.04);
  const breathe = 1 + (sr.low * 0.6 + kickPulse * 0.4) * (0.5 + audioWeight * 0.5);

  // Horizontal wave bands
  const waveCount = 5 + Math.floor(s.density * 8);
  for (let i = 0; i < waveCount; i++) {
    const yBase = (h / waveCount) * i;
    const amp = (bass * 80 + sr.low * 60 + kickPulse * 40) * s.audioSensitivity * breathe;
    const frequency = 0.01 + s.speed * 0.02;
    const phase = timePhase + i * 0.8 + sr.low * 0.5;

    ctx.beginPath();
    ctx.moveTo(0, yBase);

    for (let x = 0; x <= w; x += 4) {
      const wave = Math.sin(x * frequency + phase) * amp;
      const secondary = Math.sin(x * frequency * 2.3 + phase * 1.5) * amp * 0.3;
      const y = yBase + wave + secondary;
      ctx.lineTo(x, y);
    }

    const alpha = Math.max(FLOORS.lineAlpha, 0.15 + sr.low * 0.6);
    ctx.strokeStyle = getColor(i, s.palette, waveCount) + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = (1.5 + sr.low * 4) * breathe;
    ctx.stroke();
  }

  // Arc pulses from center — driven by audio, less by time
  const arcCount = 3 + Math.floor(avg * 5 + sr.low * 3);
  const cx = w / 2;
  const cy = h / 2;

  for (let i = 0; i < arcCount; i++) {
    const radius = Math.min(w, h) * (0.15 + i * 0.12) * breathe * (1 + kickPulse * 0.5);
    const startAngle = timePhase * 0.3 + i * 1.2 + kickPulse;
    const sweep = Math.PI * (0.3 + mids * 0.4 + sr.low * 0.3);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
    const alpha = Math.max(FLOORS.lineAlpha, 0.1 + avg * 0.25 + sr.low * 0.3);
    ctx.strokeStyle = s.palette[i % s.palette.length] + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 1 + mids * 2 + sr.low * 2;
    ctx.stroke();
  }

  // Floating spatial particles (driven by highs, not low-end)
  const particleCount = Math.floor(20 + s.density * 40);
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 97.3;
    const baseX = (Math.sin(seed + now * 0.1) * 0.5 + 0.5) * w;
    const baseY = (Math.cos(seed * 1.3 + now * 0.08) * 0.5 + 0.5) * h;
    const drift = bass * 30 * s.audioSensitivity;
    const x = baseX + Math.sin(now * 0.5 + seed) * drift;
    const y = baseY + Math.cos(now * 0.4 + seed * 1.2) * drift;
    const size = 1 + highs * 3;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = getColor(i, s.palette, particleCount);
    ctx.globalAlpha = Math.max(FLOORS.particleAlpha, 0.15 + highs * 0.4);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
/* ── Particle Memory ── */
function drawParticleMemory(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
  particles: ParticleState[], drawConnections: boolean, coreTraceAmount: number,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const density = s.density;
  const pLen = particles.length;
  const palette = s.palette;
  const pLenInv = 1 / pLen;
  const PM_COLOR = "#eaedf2";

  // Pre-compute colors and radii for the particle loop
  for (let i = 0; i < pLen; i++) {
    const p = particles[i];
    const burstBoost = p.burstTimer > 0 ? 1 + p.burstTimer / 20 * 0.5 : 0;
    const depthScale = 1 - p.depth;

    const size = (p.baseSize + p.activity * 1.5 + burstBoost * 0.5) * (0.7 + depthScale * 0.3);
    const baseAlpha = (p.brightness * 0.4 + p.activity * 0.4 + burstBoost * 0.2) * (0.6 + depthScale * 0.4);
    const alpha = Math.max(FLOORS.particleAlpha, baseAlpha);

    const color = PM_COLOR;

    // Glow — only for highly active particles (reduces gradient calls ~70%)
    if ((p.activity > 0.5 || burstBoost > 0.5) && (p.activity > 0.2 || burstBoost > 0)) {
      const glowSize = size * (3 + p.activity * 4 + burstBoost * 2);
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      const ga = Math.floor(Math.min(1, p.activity * 0.12 + burstBoost * 0.08) * 255).toString(16).padStart(2, "0");
      gr.addColorStop(0, color + ga);
      gr.addColorStop(1, "transparent");
      ctx.fillStyle = gr;
      ctx.globalAlpha = Math.max(FLOORS.particleAlpha * 0.5, alpha * 0.25);
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.3, size * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  }

  // Connections (only on fresh layer, not accum)
  __connCounter = 0;
  if (drawConnections && pLen > 10) {
    const connectThreshold = Math.min(w, h) * (0.025 + density * 0.025);
    const connectThresholdSq = connectThreshold * connectThreshold;
    ctx.globalAlpha = 0.01 + density * 0.03;
    ctx.lineWidth = 0.3;

    const step = Math.max(1, Math.floor(pLen / 200));
    for (let i = 0; i < pLen; i += step) {
      const p1 = particles[i];
      const a1 = p1.activity;
      if (a1 < 0.3) continue;
      const maxJ = Math.min(i + 6, pLen);
      const cid1 = p1.clusterId;
      const x1 = p1.x;
      const y1 = p1.y;
      for (let j = i + 1; j < maxJ; j++) {
        const p2 = particles[j];
        if (p2.activity < 0.3 || p2.clusterId !== cid1) continue;
        const dx = x1 - p2.x;
        const dy = y1 - p2.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < connectThresholdSq) {
          const a = (1 - Math.sqrt(distSq) / connectThreshold) * 0.06;
          if (a > 0.01) {
            ctx.strokeStyle = PM_COLOR + Math.floor(a * 255).toString(16).padStart(2, "0");
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            __connCounter++;
          }
        }
      }
    }
  }

  ctx.globalAlpha = 1;
}

/* ── Noise Memory (experimental) ── */
// Simple hash-based noise for flow field
function nmHash(x: number, y: number, t: number): number {
  let h = x * 374761393 + y * 668265263 + t * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 0x7fffffff;
}

function nmSmooth(x: number, y: number, t: number, scale: number): number {
  const sx = x / scale, sy = y / scale;
  const ix = Math.floor(sx), iy = Math.floor(sy);
  const fx = sx - ix, fy = sy - iy;
  const a = nmHash(ix, iy, Math.floor(t)) / 0x7fffffff;
  const b = nmHash(ix + 1, iy, Math.floor(t)) / 0x7fffffff;
  const c = nmHash(ix, iy + 1, Math.floor(t)) / 0x7fffffff;
  const d = nmHash(ix + 1, iy + 1, Math.floor(t)) / 0x7fffffff;
  const mx = fx * fx * (3 - 2 * fx);
  const my = fy * fy * (3 - 2 * fy);
  return a + (b - a) * mx + (c - a) * my + (a - b - c + d) * mx * my;
}

function drawNoiseMemory(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
  mem: { grid: { vx: number; vy: number }[][]; time: number; particles: { x: number; y: number; vx: number; vy: number; age: number; seed: number; col: number; row: number }[] },
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);

  mem.time += dt;

  const cols = 20, rows = 14;
  const cellW = w / cols, cellH = h / rows;
  const baseScale = Math.min(w, h) * 0.03;
  const density = s.density;
  const randomness = s.randomness;

  // Build flow field
  if (mem.grid.length !== rows) {
    mem.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ vx: 0, vy: 0 }))
    );
  }

  const pressure = 1 + bass * 2;
  const turbulence = 1 + mids * 1.5;
  const grain = highs * 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / cols, ny = r / rows;
      const t = mem.time * 0.15;
      const angle = nmSmooth(nx * 3 + ny * 2, ny * 3 - nx * 2, t, 1) * Math.PI * 4;
      const mag = nmSmooth(nx * 2, ny * 2, t * 0.7, 1) * 0.5 + 0.5;
      const cell = mem.grid[r][c];
      cell.vx = Math.cos(angle) * mag * baseScale * pressure;
      cell.vy = Math.sin(angle) * mag * baseScale * pressure;
      const turbAngle = nmSmooth(nx * 5, ny * 5, t * 1.3, 1) * Math.PI * 2;
      cell.vx += Math.cos(turbAngle) * turbulence * 2;
      cell.vy += Math.sin(turbAngle) * turbulence * 2;
    }
  }

  // Manage particle pool
  const targetCount = Math.floor(60 + density * 120);
  while (mem.particles.length < targetCount) {
    const seed = Math.random() * 1000;
    const c = Math.floor(Math.random() * cols);
    const r = Math.floor(Math.random() * rows);
    mem.particles.push({
      x: c * cellW + cellW * 0.5, y: r * cellH + cellH * 0.5,
      vx: 0, vy: 0, age: 0, seed, col: c, row: r,
    });
  }
  if (mem.particles.length > targetCount) {
    mem.particles.length = targetCount;
  }

  // Update particles
  const dtScaleClamped = Math.min(dt * 60, 3);
  const connectRadius = Math.min(w, h) * (0.04 + density * 0.04);
  const maxDistSq = connectRadius * connectRadius;

  for (let i = 0; i < mem.particles.length; i++) {
    const p = mem.particles[i];
    p.age += dt;

    const colF = Math.max(0, Math.min(cols - 1, Math.floor(p.x / cellW)));
    const rowF = Math.max(0, Math.min(rows - 1, Math.floor(p.y / cellH)));
    const f = mem.grid[rowF][colF];

    p.vx += f.vx * dtScaleClamped * 0.02;
    p.vy += f.vy * dtScaleClamped * 0.02;

    const drift = randomness * 0.5;
    p.vx += (nmSmooth(p.seed, mem.time * 0.3, 0, 1) - 0.5) * drift * dtScaleClamped;
    p.vy += (nmSmooth(mem.time * 0.3, p.seed, 0, 1) - 0.5) * drift * dtScaleClamped;

    let repelX = 0, repelY = 0;
    const maxJ = Math.min(i + 8, mem.particles.length);
    for (let j = i + 1; j < maxJ; j++) {
      const o = mem.particles[j];
      const dx = p.x - o.x, dy = p.y - o.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < maxDistSq && distSq > 1) {
        const force = pressure * 0.3 / distSq;
        repelX += dx * force;
        repelY += dy * force;
      }
    }
    p.vx += repelX * dtScaleClamped;
    p.vy += repelY * dtScaleClamped;

    p.vx *= 0.97;
    p.vy *= 0.97;

    p.x += p.vx * dtScaleClamped;
    p.y += p.vy * dtScaleClamped;

    if (p.x < -50) p.x = w + 50;
    if (p.x > w + 50) p.x = -50;
    if (p.y < -50) p.y = h + 50;
    if (p.y > h + 50) p.y = -50;
  }

  // Layer 1: Proximity connections (delicate lines)
  const cAlpha = 0.02 + density * 0.02 + bass * 0.02;
  ctx.globalAlpha = cAlpha;
  ctx.lineWidth = 0.3;

  const step = Math.max(1, Math.floor(mem.particles.length / 120));
  for (let i = 0; i < mem.particles.length; i += step) {
    const p1 = mem.particles[i];
    const maxJ = Math.min(i + 6, mem.particles.length);
    for (let j = i + 1; j < maxJ; j++) {
      const p2 = mem.particles[j];
      const dx = p1.x - p2.x, dy = p1.y - p2.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < maxDistSq) {
        const a = (1 - Math.sqrt(distSq) / connectRadius) * 0.04;
        if (a > 0.005) {
          ctx.strokeStyle = getColor(i, s.palette, mem.particles.length) + Math.floor(a * 255).toString(16).padStart(2, "0");
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }
  ctx.globalAlpha = 1;

  // Layer 2: Draw particles
  for (let i = 0; i < mem.particles.length; i++) {
    const p = mem.particles[i];
    const gx = grain * (nmSmooth(p.seed, mem.time * 0.5, 0, 1) - 0.5) * 3;
    const gy = grain * (nmSmooth(mem.time * 0.5, p.seed, 0, 1) - 0.5) * 3;
    const px = p.x + gx, py = p.y + gy;

    const size = 0.5 + bass * 1 + grain * 0.5;
    const alpha = Math.max(0.04, 0.06 + bass * 0.2 + mids * 0.1 + grain * 0.05);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = getColor(i, s.palette, mem.particles.length);
    ctx.globalAlpha = alpha;
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/* ── Latent Flow ── */
function drawLatentFlow(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);

  const NODE_COUNT = 96;
  const cx = w / 2, cy = h / 2;
  const fieldR = Math.min(w, h) * 0.36;
  const density = s.density;
  const randomness = s.randomness;
  const glow = s.glow;
  const speed = s.speed;

  __lfState.time += dt;
  const lf = __lfState;
  const dtS = Math.min(dt * 60, 3);

  // Audio envelope: fast attack, slow release
  const audioIn = Math.min(1, bass * 3 + avg * 1.5);
  lf.env += (audioIn - lf.env) * (audioIn > lf.env ? 0.3 : 0.04);
  const lfDrive = Math.max(0.15, lf.env); // never fully silent

  // Scale everything from the envelope
  const globalScale = 0.5 + lfDrive * 0.5;        // 0.5–1.0
  const corePulse = 0.6 + lfDrive * 0.8;           // 0.6–1.4
  const tension = 0.5 + lfDrive * 1.5;              // 0.5–2.0
  const alphaBoost = 0.3 + lfDrive * 1.2;           // 0.3–1.5
  const nodeScale = 0.3 + lfDrive * 1.2;            // 0.3–1.5

  // Init 96 nodes
  if (lf.nodes.length !== NODE_COUNT) {
    lf.nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      angle: (i / NODE_COUNT) * Math.PI * 2,
      radius: fieldR * (0.75 + Math.random() * 0.25),
      vAngle: 0, vRadius: 0, phase: Math.random() * Math.PI * 2,
      targetConnections: [] as number[],
    }));
    lf.connections = [];
    lf.reconnectTimer = 0;
  }

  // Reorganize connections periodically
  lf.reconnectTimer += dt;
  if (lf.reconnectTimer > 0.5 + mids * 2 || lf.connections.length === 0) {
    lf.reconnectTimer = 0;
    // Each node picks 1-3 targets
    for (let i = 0; i < NODE_COUNT; i++) {
      const count = 1 + Math.floor(nmSmooth(i * 13, lf.time * 0.02, 0, 1) * 3);
      lf.nodes[i].targetConnections = [];
      for (let c = 0; c < count; c++) {
        const target = Math.floor(nmSmooth(i * 17 + c * 97, lf.time * 0.03, 0, 1) * NODE_COUNT) % NODE_COUNT;
        if (target !== i && !lf.nodes[i].targetConnections.includes(target)) {
          lf.nodes[i].targetConnections.push(target);
        }
      }
    }
    // Collect unique connections
    const connSet = new Set<string>();
    for (let i = 0; i < NODE_COUNT; i++) {
      for (const t of lf.nodes[i].targetConnections) {
        const key = Math.min(i, t) + "-" + Math.max(i, t);
        if (!connSet.has(key)) {
          connSet.add(key);
          lf.connections.push({ from: i, to: t, age: 0 });
        }
      }
    }
    // Prune stale connections (keep most recent)
    if (lf.connections.length > NODE_COUNT * 2) {
      lf.connections = lf.connections.slice(-NODE_COUNT * 2);
    }
  }

  // Update nodes — almost no rotation, mostly radial audio-driven motion
  for (let i = 0; i < NODE_COUNT; i++) {
    const n = lf.nodes[i];
    const na = (nmSmooth(i * 3, lf.time * 0.003 * speed, 0, 1) - 0.5) * randomness;
    const nr = (nmSmooth(i * 7, lf.time * 0.006 * speed, 0, 1) - 0.5) * randomness;
    n.vAngle += na * 0.0006 * dtS;
    n.vRadius += nr * 0.004 * dtS;
    n.vRadius += lfDrive * 2 * dtS; // audio-driven expansion
    n.vRadius -= (n.radius - fieldR * 0.8) * 0.003 * dtS;
    n.vAngle *= 0.998;
    n.vRadius *= 0.97;
    n.angle += n.vAngle * dtS * 0.2;
    n.radius += n.vRadius * dtS;
    n.radius = Math.max(fieldR * 0.3 * globalScale, Math.min(fieldR * 1.3 * globalScale, n.radius));
  }

  // Slow connection reorganization (5-15s intervals)
  lf.reconnectTimer += dt;
  if (lf.reconnectTimer > 5 + mids * 5 || lf.connections.length === 0) {
    lf.reconnectTimer = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      const count = 1 + Math.floor(nmSmooth(i * 13, lf.time * 0.02, 0, 1) * 3);
      lf.nodes[i].targetConnections = [];
      for (let c = 0; c < count; c++) {
        const target = Math.floor(nmSmooth(i * 17 + c * 97, lf.time * 0.03, 0, 1) * NODE_COUNT) % NODE_COUNT;
        if (target !== i && !lf.nodes[i].targetConnections.includes(target)) {
          lf.nodes[i].targetConnections.push(target);
        }
      }
    }
    const connSet = new Set<string>();
    for (let i = 0; i < NODE_COUNT; i++) {
      for (const t of lf.nodes[i].targetConnections) {
        const key = Math.min(i, t) + "-" + Math.max(i, t);
        if (!connSet.has(key)) { connSet.add(key); lf.connections.push({ from: i, to: t, age: 0 }); }
      }
    }
    if (lf.connections.length > NODE_COUNT * 2) lf.connections = lf.connections.slice(-NODE_COUNT * 2);
  }

  // Age connections
  for (const c of lf.connections) c.age += dt;
  const bgCount = Math.floor(30 + density * 40);
  for (let i = 0; i < bgCount; i++) {
    const seed = i * 73.1;
    const bx = (nmSmooth(seed, lf.time * 0.02, 0, 1) * 0.9 + 0.05) * w;
    const by = (nmSmooth(lf.time * 0.02, seed, 0, 1) * 0.9 + 0.05) * h;
    const ba = (0.03 + nmSmooth(seed * 2, lf.time * 0.04, 0, 1) * 0.04) * alphaBoost;
    ctx.beginPath();
    ctx.arc(bx, by, 0.3 + highs * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = s.palette[i % s.palette.length] + Math.floor(ba * 255).toString(16).padStart(2, "0");
    ctx.fill();
  }

  // Layer 2: Connection network
  const connAlpha = 0.06 + bass * 0.3 + mids * 0.1;
  for (const c of lf.connections) {
    const n1 = lf.nodes[c.from];
    const n2 = lf.nodes[c.to];
    const x1 = cx + Math.cos(n1.angle) * n1.radius;
    const y1 = cy + Math.sin(n1.angle) * n1.radius;
    const x2 = cx + Math.cos(n2.angle) * n2.radius;
    const y2 = cy + Math.sin(n2.angle) * n2.radius;

    // Bezier control points with noise displacement
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const noiseOff = nmSmooth(c.from * 19 + c.to * 31, lf.time * 0.06 * speed, 0, 1) - 0.5;
    const cp1x = midX + Math.cos(n1.angle + noiseOff) * fieldR * 0.15 * tension;
    const cp1y = midY + Math.sin(n1.angle + noiseOff) * fieldR * 0.15 * tension;
    const cp2x = midX + Math.cos(n2.angle + noiseOff * 0.7) * fieldR * 0.15 * tension;
    const cp2y = midY + Math.sin(n2.angle + noiseOff * 0.7) * fieldR * 0.15 * tension;

    const alpha = Math.max(0.03, connAlpha * alphaBoost) * Math.min(1, c.age * 2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    ctx.strokeStyle = getColor(c.from, s.palette, NODE_COUNT) + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 0.3 + bass * 1 + glow * 0.3 + tension * 0.5;
    ctx.stroke();
  }

  // Layer 3: Outer nodes
  for (let i = 0; i < NODE_COUNT; i++) {
    const n = lf.nodes[i];
    const nx = cx + Math.cos(n.angle) * n.radius;
    const ny = cy + Math.sin(n.angle) * n.radius;
    const ns = (0.5 + bass * 1.5 + highs * 1) * nodeScale;
    const na = Math.max(0.04, (0.1 + bass * 0.3 + highs * 0.2) * alphaBoost);

    // Glow
    const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, ns * 4);
    ng.addColorStop(0, s.palette[i % s.palette.length] + "18");
    ng.addColorStop(1, "transparent");
    ctx.fillStyle = ng;
    ctx.globalAlpha = na * 0.6;
    ctx.beginPath();
    ctx.arc(nx, ny, ns * 4, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    ctx.globalAlpha = na;
    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(0.3, ns * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = getColor(i, s.palette, NODE_COUNT);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Layer 4: Central core glow
  const coreSize = Math.min(w, h) * 0.04 * corePulse;
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 10);
  coreGlow.addColorStop(0, s.palette[0] + "40");
  coreGlow.addColorStop(0.5, s.palette[1 % s.palette.length] + "20");
  coreGlow.addColorStop(1, "transparent");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, coreSize * 10, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 2; i >= 0; i--) {
    const r = coreSize * (1 + i * 0.6 + lfDrive * 0.5);
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const ca = Math.floor(Math.max(0.12, glow * (0.3 + lfDrive * 0.8)) * 50 * (1 - i * 0.2)).toString(16).padStart(2, "0");
    gr.addColorStop(0, s.palette[0] + ca);
    gr.addColorStop(0.6, s.palette[1 % s.palette.length] + ca);
    gr.addColorStop(1, "transparent");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── Archive Decoder ── */
const __adChars = [".", ",", ":", ";", "+", "*", "#", "@"];
const __adState = { noise: new Float32Array(0), phase: 0, bassEnv: 0, highEnv: 0, prevBass: 0, gridCols: 0, gridRows: 0, quality: 1 };
const __adCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const __adCtx = __adCanvas?.getContext("2d") || null;
const __adVariant = { mode: 0 };
if (typeof window !== "undefined") (window as any).__adVariant = __adVariant;

function drawArchiveDecoderLegacy(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);
  __adState.phase += dt;
  const density = s.density, speed = s.speed;
  const baseSize = Math.max(4, 10 - density * 6);
  const cols = Math.ceil(w / baseSize), rows = Math.ceil(h / baseSize), total = cols * rows;
  if (__adState.noise.length !== total) { __adState.noise = new Float32Array(total); for (let i = 0; i < total; i++) __adState.noise[i] = Math.random(); }
  const st = __adState, attack = 0.45, release = 0.035;
  st.bassEnv += (bass - st.bassEnv) * (bass > st.bassEnv ? attack : release);
  st.highEnv += (highs - st.highEnv) * (highs > st.highEnv ? attack : 0.08);
  const kick = Math.max(0, bass - st.prevBass) * 4;
  st.prevBass += (bass - st.prevBass) * 0.15;
  const bEnv = Math.max(0.1, st.bassEnv), hEnv = st.highEnv;
  const distortion = kick * 8, expansion = bEnv * 10, corruptProb = Math.min(0.3, hEnv * 0.5 + kick * 0.3), sparkleProb = hEnv * 0.02;
  ctx.font = `${baseSize}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, nx = c / cols, ny = r / rows;
      const wave = Math.sin(nx * 20 + __adState.phase * 0.4 * speed) * bEnv * 6 + Math.cos(ny * 15 + __adState.phase * 0.3 * speed) * mids * 3;
      const signal = Math.max(0, Math.min(0.99, __adState.noise[i] * 0.3 + bEnv * 0.5 + wave * 0.4));
      __adState.noise[i] += (signal - __adState.noise[i]) * 0.03;
      const char = __adChars[Math.min(Math.floor(signal * __adChars.length), __adChars.length - 1)];
      const corrupted = corruptProb > 0 && Math.random() < corruptProb;
      const sparkle = sparkleProb > 0 && Math.random() < sparkleProb;
      const gs = baseSize + expansion * signal;
      const px = c * gs + gs / 2 + distortion * Math.sin(ny * 10 + kick * 2);
      const py = r * gs + gs / 2 + distortion * Math.cos(nx * 8 + kick * 1.5);
      let alpha = Math.max(0.06, signal * 0.5 + bEnv * 0.6);
      if (corrupted) alpha = Math.min(1, alpha + kick * 0.5);
      if (sparkle) alpha = Math.min(1, alpha + 0.5);
      if (sparkle) { ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`; }
      else {
        const colorIdx = corrupted ? Math.floor(Math.random() * s.palette.length) : Math.floor(signal * s.palette.length) % s.palette.length;
        ctx.fillStyle = s.palette[colorIdx] + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      }
      ctx.fillText(char, px, py);
    }
  }
  ctx.fillStyle = `rgba(0,0,0,${0.02 + bEnv * 0.03})`;
  for (let r = 0; r < rows; r += 2) ctx.fillRect(0, r * baseSize, w, 1);
  if (corruptProb > 0.05 && Math.random() < corruptProb * 0.3) {
    ctx.fillStyle = `rgba(255,255,255,${(hEnv + kick) * 0.15})`;
    ctx.fillRect(0, Math.random() * h, w, 2 + Math.random() * 8 + kick * 4);
  }
}

function drawArchiveDecoder(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const vm = __adVariant.mode;
  if (vm === -1) {
    drawArchiveDecoderLegacy(ctx, w, h, data, len, avg, now, dt, s);
    return;
  }

  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);

  __adState.phase += dt;
  const density = s.density;
  const speed = s.speed;
  const quality = __adState.quality;
  const scale = 2;
  const rw = Math.ceil(w / scale);
  const rh = Math.ceil(h / scale);

  // Variant-specific parameters
  let baseSize: number, contrastMul: number, noiseInfluence: number, waveInfluence: number, minAlpha: number;
  let clusterMode = false, rewriteMode = false;

  if (vm === 1) {
    // AD1 — Dense Signal: smaller glyphs, stronger contrast, less empty space
    baseSize = Math.max(4, 8 - density * 5);
    contrastMul = 1.6;
    noiseInfluence = 0.2;
    waveInfluence = 0.5;
    minAlpha = 0.08;
  } else if (vm === 2) {
    // AD2 — Animatrix: machine reconstruction, clusters, self-rewriting
    baseSize = Math.max(5, 10 - density * 6);
    contrastMul = 2.0;
    noiseInfluence = 0.35;
    waveInfluence = 0.35;
    minAlpha = 0.04;
    clusterMode = true;
    rewriteMode = true;
  } else {
    // AD0 — Baseline
    baseSize = Math.max(5, 12 - density * 8);
    contrastMul = 1.0;
    noiseInfluence = 0.3;
    waveInfluence = 0.4;
    minAlpha = 0.06;
  }

  const cols = Math.ceil(rw / baseSize);
  const rows = Math.ceil(rh / baseSize);
  const total = cols * rows;

  __adState.gridCols = cols;
  __adState.gridRows = rows;

  // Init noise buffer
  if (__adState.noise.length !== total) {
    __adState.noise = new Float32Array(total);
    for (let i = 0; i < total; i++) __adState.noise[i] = Math.random();
  }

  // Audio envelopes
  const st = __adState;
  const attack = 0.5, release = 0.04;
  st.bassEnv += (bass * 2 - st.bassEnv) * (bass > st.bassEnv ? attack : release);
  st.highEnv += (highs * 2 - st.highEnv) * (highs > st.highEnv ? attack : 0.1);
  const kick = Math.max(0, bass - st.prevBass) * 10;
  st.prevBass += (bass - st.prevBass) * 0.2;
  const bEnv = Math.max(0.05, st.bassEnv);
  const hEnv = st.highEnv;
  const distortion = Math.min(w * 0.15, kick * 25);
  const expansion = bEnv * 25;
  const corruptProb = Math.min(0.6, hEnv + kick * 0.5);
  const sparkleProb = hEnv * 0.1;

  // Setup offscreen canvas
  const oc = __adCanvas;
  const octx = __adCtx;
  if (!oc || !octx) return;
  if (oc.width !== rw || oc.height !== rh) {
    oc.width = rw;
    oc.height = rh;
  }
  octx.clearRect(0, 0, rw, rh);
  octx.fillStyle = "#030405";
  octx.fillRect(0, 0, rw, rh);
  octx.font = `${baseSize}px monospace`;
  octx.textAlign = "center";
  octx.textBaseline = "middle";

  // Noise-based stochastic values (no Math.random per cell)
  const noiseLen = __adState.noise.length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= noiseLen) break;
      const nx = c / cols, ny = r / rows;

      const wave = Math.sin(nx * 20 + __adState.phase * 0.4 * speed) * bEnv * 15
                 + Math.cos(ny * 15 + __adState.phase * 0.3 * speed) * mids * 6;

      // AD2: cluster mode — noise dominates, creating emergent clusters
      let signal: number;
      if (clusterMode) {
        signal = Math.max(0, Math.min(0.99, __adState.noise[i] * noiseInfluence + bEnv * 0.6 + wave * 0.4));
        if (rewriteMode && kick > 0.8 && __adState.noise[(i * 11) % noiseLen] < kick * 0.3) {
          __adState.noise[i] = Math.random();
        }
      } else {
        signal = Math.max(0, Math.min(0.99, __adState.noise[i] * noiseInfluence + bEnv * 0.5 + wave * waveInfluence));
      }
      __adState.noise[i] += (signal - __adState.noise[i]) * (clusterMode ? 0.05 : 0.03);

      const char = __adChars[Math.min(Math.floor(signal * __adChars.length), __adChars.length - 1)];

      const noiseVal = __adState.noise[(i * 7) % noiseLen];
      const corrupted = corruptProb > 0 && noiseVal < corruptProb;
      const sparkle = sparkleProb > 0 && noiseVal > 1 - sparkleProb;

      const gs = baseSize + expansion * signal;
      const distortX = distortion * Math.sin(ny * 10 + kick * 2);
      const distortY = distortion * Math.cos(nx * 8 + kick * 1.5);
      const px = c * gs + gs / 2 + distortX;
      const py = r * gs + gs / 2 + distortY;

      let alpha = Math.max(0.04, signal * 0.4 + bEnv * 1.0);
      if (corrupted) alpha = Math.min(1, alpha + 0.6);
      if (sparkle) alpha = Math.min(1, alpha + 0.8);

      if (sparkle) {
        octx.fillStyle = `rgba(255,255,255,${alpha})`;
      } else {
        const colorIdx = corrupted ? Math.floor(noiseVal * s.palette.length) % s.palette.length : Math.floor(signal * s.palette.length) % s.palette.length;
        octx.fillStyle = s.palette[colorIdx] + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      }
      octx.fillText(char, px / scale, py / scale);
    }
  }

  // Scanlines with bass-driven intensity
  octx.fillStyle = `rgba(0,0,0,${0.03 + bEnv * 0.08})`;
  for (let r = 0; r < rows; r += 2) {
    octx.fillRect(0, r * baseSize, rw, 1);
  }

  // Corruption bands — much more active
  if (corruptProb > 0.05 && __adState.noise[Math.floor((__adState.phase * 31) % noiseLen)] < corruptProb * 0.4) {
    const bandY = Math.random() * rh;
    const bandH = 2 + Math.random() * 12 + kick * 8;
    octx.fillStyle = `rgba(255,255,255,${(hEnv + kick) * 0.25})`;
    octx.fillRect(0, bandY, rw, bandH);
  }

  // Scale up to main canvas
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(oc, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

/* ── ASCII Field ── */
function drawAsciiField(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);
  const size = Math.max(6, 14 - s.density * 8);
  const cols = Math.ceil(w / size), rows = Math.ceil(h / size);
  const chars = ".:;+=xX$&#";
  ctx.font = `${size}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / cols, ny = r / rows;
      const phase = now * (0.05 + s.speed * 0.05) + nx * 3 + ny * 2;
      const val = Math.sin(phase) * bass * 3 + Math.cos(nx * 4 + ny * 3 + now * 0.03) * mids * 1.5;
      const signal = Math.max(0, Math.min(1, 0.5 + val * 0.5));
      const ci = Math.floor(signal * chars.length) % chars.length;
      const alpha = Math.max(0.05, 0.1 + signal * 0.4 + highs * 0.3);
      const cx = c * size + size / 2 + Math.sin(phase * 0.5 + ny) * bass * 20;
      const cy = r * size + size / 2 + Math.cos(phase * 0.5 + nx) * bass * 20;
      ctx.fillStyle = s.palette[ci % s.palette.length] + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      ctx.fillText(chars[ci], cx, cy);
    }
  }
  ctx.globalAlpha = 1;
}

/* ── Topographic Wave ── */
function drawTopographicWave(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);
  const density = Math.floor(6 + s.density * 14);
  const speed = s.speed;
  const rowH = h / density;
  const bassDisp = bass * 80 * s.audioSensitivity;
  for (let r = 0; r < density; r++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const nx = x / w;
      const phase = now * (0.04 + speed * 0.03) + nx * 4 + r * 0.8;
      const wave = Math.sin(phase) * bassDisp + Math.sin(phase * 2.3 + mids * 2) * 20 + Math.sin(phase * 0.7 + r * 1.3) * 10;
      const y = r * rowH + wave + Math.sin(nx * 6 + now * 0.02 * speed + r * 0.5) * 5;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const alpha = Math.max(0.06, 0.12 + bass * 0.4 + highs * 0.15);
    ctx.strokeStyle = getColor(r, s.palette, density) + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 0.5 + bass * 1.5 + s.glow * 0.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ── Orbital Spectrum ── */
function drawOrbitalSpectrum(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);
  const cx = w / 2, cy = h / 2;
  const orbitCount = 3 + Math.floor(s.density * 4);
  const nodesPerOrbit = Math.floor(6 + s.density * 18);
  const baseR = Math.min(w, h) * 0.06;
  for (let o = 0; o < orbitCount; o++) {
    const orbitR = baseR * (1 + o * 1.2 + bass * 0.8);
    const eccentricity = 0.1 + s.randomness * 0.3 + mids * 0.2;
    const speed = 0.1 + s.speed * 0.15 + o * 0.03;
    // Orbit path
    ctx.beginPath();
    ctx.ellipse(cx, cy, orbitR, orbitR * (1 - eccentricity), 0, 0, Math.PI * 2);
    ctx.strokeStyle = s.palette[o % s.palette.length] + "18";
    ctx.lineWidth = 0.3;
    ctx.stroke();
    // Orbiting nodes
    for (let n = 0; n < nodesPerOrbit; n++) {
      const angle = now * speed + (n / nodesPerOrbit) * Math.PI * 2;
      const rx = orbitR, ry = orbitR * (1 - eccentricity);
      const px = cx + Math.cos(angle) * rx;
      const py = cy + Math.sin(angle) * ry;
      const size = 0.5 + bass * 1.5 + highs * 1;
      const alpha = Math.max(0.05, 0.1 + bass * 0.3 + highs * 0.3);
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = s.palette[n % s.palette.length] + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
    }
  }
  // Core
  const coreSize = Math.min(w, h) * 0.04 * (0.5 + bass * 0.5);
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 4);
  gr.addColorStop(0, s.palette[0] + "40");
  gr.addColorStop(1, "transparent");
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(cx, cy, coreSize * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ── Spectral Grid ── */
function drawSpectralGrid(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);
  const cols = Math.floor(10 + s.density * 20);
  const rows = Math.floor(6 + s.density * 10);
  const cellW = w / cols, cellH = h / rows;
  const drift = now * (0.01 + s.speed * 0.02);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = Math.floor(((c + drift * 3) % cols) / cols * len);
      const val = data[idx] / 255;
      const height = val * h * 0.4 * (0.5 + bass * 0.5) + highs * h * 0.05;
      const x = c * cellW + cellW * 0.5 + Math.sin(drift + r * 0.5) * 5;
      const y = r * cellH + cellH - height;
      const alpha = Math.max(0.05, 0.1 + val * 0.5 + mids * 0.15);
      const col = getColor(c + r * cols, s.palette, cols * rows);
      ctx.fillStyle = col + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      ctx.fillRect(x - cellW * 0.3, y, cellW * 0.6, height);
    }
  }
  ctx.globalAlpha = 1;
}

/* ── Pulse Field ── */
const __pfState = { shockwave: 0, prevBass: 0, phase: 0 };

function drawPulseField(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mids = data.slice(4, 12).reduce((a, b) => a + b, 0) / (8 * 255);
  const highs = data.slice(20, 40).reduce((a, b) => a + b, 0) / (20 * 255);

  const pf = __pfState;
  pf.phase += dt;
  const cx = w / 2, cy = h / 2;
  const density = s.density;
  const speed = s.speed;
  const maxR = Math.min(w, h) * 0.45;

  // Shockwave from kick
  const kick = Math.max(0, bass - pf.prevBass) * 6;
  pf.prevBass += (bass - pf.prevBass) * 0.15;
  if (kick > 0.3) pf.shockwave = Math.min(1, pf.shockwave + kick * 0.5);
  pf.shockwave *= 0.97; // decay

  // Bass envelope
  const bEnv = Math.max(0.1, bass * 1.5 + pf.shockwave * 0.5);

  // Concentric rings
  const ringCount = Math.floor(4 + density * 8);
  for (let r = 0; r < ringCount; r++) {
    const ringR = (maxR / ringCount) * (r + 1) * bEnv;
    const phase = pf.phase * (0.05 + speed * 0.05) + r * 0.5;
    const wobble = Math.sin(phase) * 3 + Math.sin(phase * 2 + mids * 3) * 2;
    const alpha = Math.max(0.04, 0.08 + bass * 0.3 - r * 0.01);

    ctx.beginPath();
    ctx.arc(cx, cy, ringR + wobble, 0, Math.PI * 2);
    ctx.strokeStyle = getColor(r, s.palette, ringCount) + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 0.3 + bEnv * 1.5 - r * 0.05;
    ctx.stroke();
  }

  // Shockwave ring (visible expanding pulse)
  if (pf.shockwave > 0.05) {
    const swR = maxR * 0.3 + pf.shockwave * maxR * 0.7;
    const swAlpha = pf.shockwave * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, swR, 0, Math.PI * 2);
    ctx.strokeStyle = s.palette[0] + Math.floor(swAlpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 1 + pf.shockwave * 3;
    ctx.stroke();
  }

  // Vertical energy spikes
  const spikeCount = Math.floor(10 + density * 20);
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2 + pf.phase * 0.02 * speed;
    const baseR = maxR * 0.6 * bEnv;
    const idx = Math.floor((i / spikeCount) * len);
    const val = data[idx] / 255;
    const height = val * h * 0.15 * bEnv + highs * h * 0.03;
    const px = cx + Math.cos(angle) * baseR;
    const py = cy + Math.sin(angle) * baseR;
    const alpha = Math.max(0.05, 0.1 + val * 0.5 + highs * 0.2);
    ctx.fillStyle = getColor(i, s.palette, spikeCount) + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.fillRect(px - 1, py - height, 2, height);
  }

  // Surrounding particle terrain
  const particleCount = Math.floor(30 + density * 60);
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 73.1;
    const angle = pf.phase * 0.01 * speed + seed;
    const dist = maxR * (0.7 + Math.sin(angle + pf.phase * 0.02) * 0.3 * bEnv);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const size = 0.5 + bass * 1 + highs * 0.5;
    const alpha = Math.max(0.03, 0.05 + bass * 0.2 + highs * 0.15);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = getColor(i, s.palette, particleCount) + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.fill();
  }

  // Central core
  const coreSize = Math.min(w, h) * 0.03 * bEnv;
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 5);
  gr.addColorStop(0, s.palette[0] + "45");
  gr.addColorStop(0.5, s.palette[1 % s.palette.length] + "20");
  gr.addColorStop(1, "transparent");
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(cx, cy, coreSize * 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ── Glitch / VHS post-processing ── */
function drawGlitch(
  ctx: CanvasRenderingContext2D, w: number, h: number, avg: number, now: number, glitch: number, vhs: number,
) {
  const strength = Math.min(1, vhs);
  const corrupt = __glitchState;

  // — Analog Layer (always present when strength > 0) —

  if (strength > 0.01) {
    // Film grain
    const grainCount = Math.floor(strength * w * h * 0.0015);
    for (let i = 0; i < grainCount; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      ctx.fillStyle = `rgba(255,255,255,${strength * 0.015 * Math.random()})`;
      ctx.fillRect(gx, gy, 1 + Math.random() * 2, 1);
    }

    // Scanlines
    ctx.fillStyle = `rgba(0,0,0,${strength * 0.025})`;
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // Vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    vg.addColorStop(0, "transparent");
    vg.addColorStop(1, `rgba(0,0,0,${strength * 0.35})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // — Corruption Events (timed bursts, independent of vhs but scaled by it) —
  if (strength < 0.01) return;

  corrupt.timer += 1 / 60;

  // Schedule next glitch
  if (!corrupt.isGlitching && corrupt.timer > corrupt.nextGlitch) {
    corrupt.isGlitching = true;
    corrupt.glitchTimer = 0;
    corrupt.tearX = (Math.random() - 0.5) * 40;
    const isStrong = Math.random() < 0.25;
    corrupt.nextGlitch = 5 + Math.random() * (isStrong ? 40 : 10);
    if (strength > 0.5) corrupt.nextGlitch *= 0.6;
    corrupt.timer = 0;
  }

  if (corrupt.isGlitching) {
    corrupt.glitchTimer += 1 / 60;
    const duration = 0.05 + Math.random() * 0.15;

    if (corrupt.glitchTimer < duration) {
      const intensity = strength * corrupt.glitchTimer * 10;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Horizontal tracking shift
      const bandY = Math.random() * h;
      const bandH = 2 + Math.random() * 8;
      const offset = corrupt.tearX * (0.5 + Math.random() * 0.5);

      for (let row = bandY; row < Math.min(h, bandY + bandH); row++) {
        const rowStart = row * w * 4;
        const shift = rowStart + offset * 4;
        if (shift >= 0 && shift + w * 4 < data.length) {
          const copy = data.slice(rowStart, rowStart + w * 4);
          data.set(data.slice(shift, shift + w * 4), rowStart);
          data.set(copy, shift);
        }
      }

      // RGB channel offset on the band
      if (strength > 0.3) {
        for (let row = bandY; row < Math.min(h, bandY + bandH); row++) {
          const rowStart = row * w * 4;
          for (let col = 0; col < w * 4; col += 4) {
            data[rowStart + col] = Math.min(255, data[rowStart + col] + intensity * 15);
            data[rowStart + col + 1] = Math.max(0, data[rowStart + col + 1] - intensity * 10);
          }
        }
      }

      // Noise burst overlay
      if (strength > 0.4 && Math.random() < 0.3) {
        const burstCount = Math.floor(strength * 50);
        for (let i = 0; i < burstCount; i++) {
          const bx = Math.random() * w;
          const by = Math.random() * h;
          data[Math.floor(by) * w * 4 + Math.floor(bx) * 4] = 255;
          data[Math.floor(by) * w * 4 + Math.floor(bx) * 4 + 1] = 255;
          data[Math.floor(by) * w * 4 + Math.floor(bx) * 4 + 2] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Brightness flicker
      if (Math.random() < 0.2) {
        ctx.fillStyle = `rgba(255,255,255,${intensity * 0.03})`;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      corrupt.isGlitching = false;
      corrupt.timer = 0;
    }
  }
}

/* ── Membrane ── */
function drawMembrane(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState, coreTraceAmount: number,
) {
  const amount = s.membraneAmount;
  if (amount < 0.01) return;
  ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, amount) * coreTraceAmount;

  const speed = s.speed * 0.3;
  const intensity = s.audioSensitivity;
  const cx = w / 2;
  const cy = h / 2;
  const bands = Math.min(len, Math.floor(64 * coreTraceAmount));
  const step = len / bands;

  for (let b = 0; b < bands; b++) {
    const i = Math.floor(b * step);
    const val = data[i] / 255;
    const angle = (b / bands) * Math.PI * 2 + now * speed;
    const radius = Math.min(w, h) * 0.35 * s.fieldScale * (0.3 + val * 0.7 * intensity);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.arc(x, y, (1 + val * 4 * s.glow) * coreTraceAmount, 0, Math.PI * 2);
    ctx.fillStyle = getColor(b, s.palette, bands);
    ctx.fill();
  }

  const lineAlpha = Math.floor(Math.max(FLOORS.lineAlpha * 255, 15 * s.glow * coreTraceAmount)).toString(16).padStart(2, "0");
  ctx.strokeStyle = s.palette[0] + lineAlpha;
  ctx.lineWidth = (0.5 + s.glow * 2) * coreTraceAmount;
  ctx.beginPath();
  for (let i = 0; i < len; i += 4) {
    const x = (i / len) * w;
    const val = data[i] / 255;
    const y = cy + (val - 0.5) * h * 0.5 * intensity;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (s.glow * coreTraceAmount > 0.1) {
    const ringRadius = Math.min(w, h) * 0.3 * s.fieldScale;
    const gr = ctx.createRadialGradient(cx, cy, ringRadius * 0.6, cx, cy, ringRadius);
    gr.addColorStop(0, "transparent");
    gr.addColorStop(0.7, s.palette[0] + Math.floor(Math.max(FLOORS.membraneAlpha * 255, 8 * s.glow * coreTraceAmount)).toString(16).padStart(2, "0"));
    gr.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, amount * 0.4) * coreTraceAmount;
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/* ── Topography ── */
function drawTopography(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.topographyAmount;
  if (amount < 0.01) return;
  ctx.globalAlpha = Math.max(FLOORS.topographyAlpha, amount);

  const density = s.density;
  const speed = s.speed * 0.4;
  const cols = Math.floor(15 + density * 35);
  const rows = Math.floor(8 + density * 18);
  const cellW = w / cols;
  const cellH = h / rows;
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);

  for (let r = 0; r < rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      const idx = Math.floor((c / cols) * len);
      const val = data[idx] / 255;
      const elevation = bass * h * 0.15 * s.audioSensitivity + val * h * 0.08 * s.audioSensitivity;
      const y = r * cellH + elevation * Math.sin(now * speed + c * 0.3 + r * 0.7 + s.randomness * 2);
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const alpha = Math.floor(Math.max(FLOORS.lineAlpha * 255, 8 + s.glow * 25)).toString(16).padStart(2, "0");
    ctx.strokeStyle = getColor(r, s.palette, rows) + alpha;
    ctx.lineWidth = Math.max(0.4, 0.5 + s.glow);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

/* ── Particles ── */
function drawParticles(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.particleAmount;
  if (amount < 0.01) return;
  ctx.globalAlpha = Math.max(FLOORS.particleAlpha, amount);

  const density = s.density;
  const count = Math.floor(15 + density * 55 * amount);
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);

  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const x = (w * 0.2) + (Math.sin(now * 0.1 * s.speed + seed) * 0.5 + 0.5) * w * 0.6;
    const y = (h * 0.2) + (Math.cos(now * 0.08 * s.speed + seed * 0.7) * 0.5 + 0.5) * h * 0.6;
    const val = data[i % len] / 255;
    const size = 1 + val * 4 * s.audioSensitivity;
    const pulseX = bass * 20 * s.bassSensitivity * (Math.sin(now * 2 + seed) - 0.5);
    const pulseY = bass * 20 * s.bassSensitivity * (Math.cos(now * 1.7 + seed * 1.1) - 0.5);

    ctx.beginPath();
    ctx.arc(x + pulseX, y + pulseY, size, 0, Math.PI * 2);
    ctx.fillStyle = getColor(i, s.palette, count);
    const alpha = Math.max(FLOORS.particleAlpha, amount * (0.2 + val * 0.6 * s.audioSensitivity));
    ctx.globalAlpha = alpha;
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/* ── Grid ── */
function drawGrid(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.gridAmount;
  if (amount < 0.01) return;
  ctx.globalAlpha = Math.max(FLOORS.gridAlpha, amount);

  const density = s.density;
  const speed = s.speed * 0.4;
  const cols = Math.floor(10 + density * 28);
  const rows = Math.floor(8 + density * 18);
  const cellW = w / cols;
  const cellH = h / rows;
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const idx = Math.floor((c / cols) * len);
      const val = data[idx] / 255;
      const x = c * cellW + Math.sin(now * speed + r * 0.5) * bass * 20 * s.audioSensitivity;
      const y = r * cellH + Math.cos(now * speed * 0.8 + c * 0.5) * val * 15 * s.audioSensitivity;
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const alpha = Math.floor(Math.max(FLOORS.lineAlpha * 255, 10 + s.glow * 15)).toString(16).padStart(2, "0");
    ctx.strokeStyle = getColor(r, s.palette, rows) + alpha;
    ctx.lineWidth = Math.max(0.3, 0.3 + s.glow * 0.5);
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const idx = Math.floor((r / rows) * len);
      const val = data[idx] / 255;
      const x = c * cellW + Math.sin(now * speed + r * 0.5) * bass * 20 * s.audioSensitivity;
      const y = r * cellH + Math.cos(now * speed * 0.8 + c * 0.5) * val * 15 * s.audioSensitivity;
      r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const alpha = Math.floor(Math.max(FLOORS.lineAlpha * 255, 10 + s.glow * 15)).toString(16).padStart(2, "0");
    ctx.strokeStyle = getColor(c, s.palette, cols) + alpha;
    ctx.lineWidth = Math.max(0.3, 0.3 + s.glow * 0.5);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
