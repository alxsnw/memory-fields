"use client";

import { useEffect, useRef, useCallback } from "react";
import type { InterpolatedState } from "@/lib/visual-journey";

type VisualMode = "signal-field" | "spatial-rhythm" | "particle-memory";

interface CanvasVisualizerProps {
  state: InterpolatedState;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  glitchAmount?: number;
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
  coreTraceAmount = 1,
  activeVisualMode = "signal-field",
  prevVisualMode = "signal-field",
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
  const prevBassRef = useRef(0);
  const pmInitRef = useRef(false);
  const perfRef = useRef({ fps: 60, frameTimes: [] as number[], quality: 1, frames: 0 });
  const debugRef = useRef({ activeMode: "", fps: 60, avgFps: 60, frameTime: 0, renderTime: 0, dpr: 1, particleCount: 0, connectionCount: 0, layers: 0, modes: [] as string[], warning: "" });
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
      if (activeVisualMode === "particle-memory" && !isTransitioning) {
        decayRate = 0.92 + effCoreTrace * 0.07;
      } else if (isTransitioning) {
        decayRate = 0.95;
      } else {
        decayRate = 0.985;
      }
      
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

      // Track which modes are actively rendering for crossfade validation
      const renderingModes: string[] = [];
      if (signalFieldAlpha > 0.01) renderingModes.push("signal-field");
      if (spatialRhythmAlpha > 0.01) renderingModes.push("spatial-rhythm");
      if (particleMemoryAlpha > 0.01) renderingModes.push("particle-memory");
      debugRef.current.modes = renderingModes;
      debugRef.current.warning = renderingModes.length > 2 ? `WARNING: ${renderingModes.length} MODES` : "";

      // Debug info
      debugRef.current.activeMode = activeVisualMode;
      debugRef.current.fps = perf.fps;
      debugRef.current.particleCount = particleMemRef.current.length;
      debugRef.current.layers = (signalFieldAlpha > 0.01 ? 1 : 0) + (spatialRhythmAlpha > 0.01 ? 1 : 0) + (particleMemoryAlpha > 0.01 ? 1 : 0);

      // Initialize/update Particle Memory state
      const tParticleUpdate = performance.now();
      if (particleMemoryAlpha > 0.01 || signalFieldAlpha < 0.99 || spatialRhythmAlpha < 0.99) {
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
          accumCtx.globalAlpha = signalFieldAlpha;
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
        ctx.globalAlpha = signalFieldAlpha;
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
      {
        const arr = timings.freshDraw;
        arr.push(performance.now() - tFresh);
        if (arr.length > 120) arr.shift();
      }
      debugRef.current.connectionCount = __connCounter;

      // Glitch pass
      if (glitchAmount > 0) {
        drawGlitch(ctx, w, h, avg, now, glitchAmount);
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

        ctx.globalAlpha = activeAlpha;
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

    animRef.current = requestAnimationFrame(draw);
    // Frame total timing
    const frameT = performance.now() - tFrame;
    const ftArr = timingRef.current.frameTotal;
    ftArr.push(frameT);
    if (ftArr.length > 120) ftArr.shift();
    debugRef.current.frameTime = frameT;
    debugRef.current.renderTime = rollingAvg(ftArr);
    debugRef.current.avgFps = ftArr.length > 1 ? Math.round((ftArr.length - 1) / ((ftArr[ftArr.length - 1] - ftArr[0]) / 1000)) : 60;
  }, [state, analyserNode, isPlaying, glitchAmount, coreTraceAmount, activeVisualMode, prevVisualMode, transitionProgress, idleTransitionProgress, paletteMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    animRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ background: "#030405" }}
      />
      <div className="fixed top-20 right-4 z-50 font-mono text-[9px] text-frost/30 leading-[1.3] pointer-events-none select-none text-right">
        <div className="text-frost/50">{debugRef.current.activeMode.replace("-", " ")}</div>
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

  // Horizontal wave bands driven by bass
  const waveCount = 5 + Math.floor(s.density * 8);
  for (let i = 0; i < waveCount; i++) {
    const yBase = (h / waveCount) * i;
    const amplitude = bass * 80 * s.audioSensitivity + mids * 40 * s.audioSensitivity;
    const frequency = 0.01 + s.speed * 0.02;
    const phase = now * (0.3 + s.speed * 0.5) + i * 0.8;

    ctx.beginPath();
    ctx.moveTo(0, yBase);

    for (let x = 0; x <= w; x += 4) {
      const wave = Math.sin(x * frequency + phase) * amplitude;
      const secondary = Math.sin(x * frequency * 2.3 + phase * 1.5) * amplitude * 0.3;
      const y = yBase + wave + secondary;
      ctx.lineTo(x, y);
    }

    const alpha = Math.max(FLOORS.lineAlpha, 0.15 + bass * 0.3);
    ctx.strokeStyle = getColor(i, s.palette, waveCount) + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 1.5 + bass * 2;
    ctx.stroke();
  }

  // Arc pulses from center driven by beat
  const arcCount = 3 + Math.floor(avg * 5);
  const cx = w / 2;
  const cy = h / 2;

  for (let i = 0; i < arcCount; i++) {
    const radius = Math.min(w, h) * (0.15 + i * 0.12) * (1 + bass * 0.5);
    const startAngle = now * (0.2 + s.speed * 0.3) + i * 1.2;
    const sweep = Math.PI * (0.3 + mids * 0.4);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
    const alpha = Math.max(FLOORS.lineAlpha, 0.1 + avg * 0.25);
    ctx.strokeStyle = s.palette[i % s.palette.length] + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 1 + mids * 2;
    ctx.stroke();
  }

  // Floating spatial particles
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

/* ── Glitch / VHS post-processing ── */
function drawGlitch(
  ctx: CanvasRenderingContext2D, w: number, h: number, avg: number, now: number, amount: number,
) {
  const intensity = Math.min(1, amount * (0.5 + avg * 0.5));

  if (intensity < 0.05) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Scanlines
  const scanlineStrength = intensity * 0.08;
  for (let y = 0; y < h; y += 3) {
    const idx = y * w * 4;
    for (let x = 0; x < w * 4; x += 4) {
      data[idx + x] = Math.min(255, data[idx + x] + scanlineStrength * 30);
      data[idx + x + 1] = Math.max(0, data[idx + x + 1] - scanlineStrength * 20);
      data[idx + x + 2] = Math.max(0, data[idx + x + 2] - scanlineStrength * 10);
    }
  }

  // Occasional horizontal tear
  const tearProb = intensity * 0.003;
  if (Math.random() < tearProb) {
    const tearY = Math.floor(Math.random() * h);
    const tearH = 2 + Math.floor(Math.random() * 6);
    const offset = Math.floor((Math.random() - 0.5) * 40);
    for (let row = tearY; row < Math.min(h, tearY + tearH); row++) {
      const rowIdx = row * w * 4;
      const shiftedRowIdx = row * w * 4 + offset * 4;
      if (shiftedRowIdx >= 0 && shiftedRowIdx + w * 4 < data.length) {
        const copy = data.slice(rowIdx, rowIdx + w * 4);
        data.set(data.slice(shiftedRowIdx, shiftedRowIdx + w * 4), rowIdx);
        data.set(copy, shiftedRowIdx);
      }
    }
  }

  // Subtle RGB split on edges
  const splitStrength = intensity * 0.3;
  if (splitStrength > 0.1) {
    const splitY = Math.floor(Math.random() * h);
    const splitH = 1 + Math.floor(Math.random() * 3);
    for (let row = splitY; row < Math.min(h, splitY + splitH); row++) {
      const rowStart = row * w * 4;
      for (let col = 0; col < w * 4; col += 4) {
        const idx2 = rowStart + col;
        data[idx2] = Math.min(255, data[idx2] + splitStrength * 20);
        data[idx2 + 1] = Math.max(0, data[idx2 + 1] - splitStrength * 15);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Analog shimmer overlay
  ctx.fillStyle = `rgba(255,255,255,${intensity * 0.015})`;
  ctx.fillRect(Math.random() * w * 0.5, 0, w * 0.5, h);
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
