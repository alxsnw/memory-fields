"use client";

import { useEffect, useRef, useCallback } from "react";
import type { InterpolatedState } from "@/lib/visual-journey";

interface CanvasVisualizerProps {
  state: InterpolatedState;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  glitchAmount?: number;
}

const FLOORS = {
  membraneAlpha: 0.08,
  particleAlpha: 0.06,
  topographyAlpha: 0.08,
  gridAlpha: 0.06,
  coreGlow: 0.2,
  lineAlpha: 0.08,
};

export function CanvasVisualizer({ state, analyserNode, isPlaying, glitchAmount = 0 }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accumRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const traceRef = useRef(0);
  const glitchPhaseRef = useRef(0);
  const glitchEventRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    // Accumulation decay
    if (accumCtx && isPlaying) {
      traceRef.current += dt;
      accumCtx.globalAlpha = 0.985;
      accumCtx.drawImage(accum, 0, 0);
      accumCtx.globalAlpha = 1;
    }

    if (analyserNode && isPlaying) {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;

      // Draw to accumulation canvas
      if (accumCtx) {
        drawMembrane(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
        drawTopography(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
        drawParticles(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
        drawGrid(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
        drawCore(accumCtx, w, h, dataArray, bufferLength, avg, now, state);
        drawSignalField(accumCtx, w, h, dataArray, bufferLength, avg, now, dt, state);
      }

      // Draw accumulation to main canvas
      ctx.drawImage(accum, 0, 0);

      // Draw fresh layers on top
      drawMembrane(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
      drawTopography(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
      drawParticles(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
      drawGrid(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
      drawCore(ctx, w, h, dataArray, bufferLength, avg, now, state);
      drawSignalField(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);

      // Glitch pass
      if (glitchAmount > 0) {
        drawGlitch(ctx, w, h, avg, now, glitchAmount);
      }
    } else {
      drawIdleAura(ctx, w, h, now, state);
      drawCoreIdle(ctx, w, h, now, state);
      if (accumCtx) {
        accumCtx.clearRect(0, 0, w, h);
        traceRef.current = 0;
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [state, analyserNode, isPlaying, glitchAmount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
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
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: "#030405" }}
    />
  );
}

function getColor(i: number, palette: string[], count: number): string {
  return palette[Math.floor((i / count) * palette.length) % palette.length];
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
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.membraneAmount;
  if (amount < 0.01) return;
  ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, amount);

  const speed = s.speed * 0.3;
  const intensity = s.audioSensitivity;
  const cx = w / 2;
  const cy = h / 2;
  const bands = Math.min(len, 64);
  const step = len / bands;

  for (let b = 0; b < bands; b++) {
    const i = Math.floor(b * step);
    const val = data[i] / 255;
    const angle = (b / bands) * Math.PI * 2 + now * speed;
    const radius = Math.min(w, h) * 0.35 * s.fieldScale * (0.3 + val * 0.7 * intensity);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.arc(x, y, 1 + val * 4 * s.glow, 0, Math.PI * 2);
    ctx.fillStyle = getColor(b, s.palette, bands);
    ctx.fill();
  }

  const lineAlpha = Math.floor(Math.max(FLOORS.lineAlpha * 255, 15 * s.glow)).toString(16).padStart(2, "0");
  ctx.strokeStyle = s.palette[0] + lineAlpha;
  ctx.lineWidth = 0.5 + s.glow * 2;
  ctx.beginPath();
  for (let i = 0; i < len; i += 4) {
    const x = (i / len) * w;
    const val = data[i] / 255;
    const y = cy + (val - 0.5) * h * 0.5 * intensity;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (s.glow > 0.1) {
    const ringRadius = Math.min(w, h) * 0.3 * s.fieldScale;
    const gr = ctx.createRadialGradient(cx, cy, ringRadius * 0.6, cx, cy, ringRadius);
    gr.addColorStop(0, "transparent");
    gr.addColorStop(0.7, s.palette[0] + Math.floor(Math.max(FLOORS.membraneAlpha * 255, 8 * s.glow)).toString(16).padStart(2, "0"));
    gr.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.globalAlpha = Math.max(FLOORS.membraneAlpha, amount * 0.4);
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
