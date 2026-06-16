"use client";

import { useEffect, useRef, useCallback } from "react";
import type { InterpolatedState } from "@/lib/visual-journey";
import type { AnalyserNode } from "@/types";

interface CanvasVisualizerProps {
  state: InterpolatedState;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

export function CanvasVisualizer({ state, analyserNode, isPlaying }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const now = performance.now() / 1000;
    const dt = now - timeRef.current;
    timeRef.current = now;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#030405";
    ctx.fillRect(0, 0, w, h);

    if (analyserNode && isPlaying) {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;

      drawMembrane(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
      drawTopography(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
      drawParticles(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
      drawGrid(ctx, w, h, dataArray, bufferLength, avg, now, dt, state);
    } else {
      drawIdleAura(ctx, w, h, now, state);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [state, analyserNode, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
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

function drawIdleAura(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, s: InterpolatedState) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.2 * s.fieldScale;

  for (let i = 0; i < 4; i++) {
    const phase = now * 0.15 + i * 1.8;
    const x = cx + Math.cos(phase * 0.7) * r * 0.6;
    const y = cy + Math.sin(phase * 0.5 + i) * r * 0.6;
    const radius = r * (0.4 + Math.sin(now * 0.12 + i * 1.3) * 0.15);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = s.palette[i % s.palette.length] + "10";
    ctx.globalAlpha = 0.15 + Math.sin(now * 0.08 + i) * 0.05;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMembrane(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.membraneAmount;
  if (amount < 0.05) return;
  ctx.globalAlpha = amount;

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

  // Soft connecting lines
  ctx.strokeStyle = s.palette[0] + Math.floor(15 * s.glow).toString(16).padStart(2, "0");
  ctx.lineWidth = 0.5 + s.glow * 2;
  ctx.beginPath();
  for (let i = 0; i < len; i += 4) {
    const x = (i / len) * w;
    const val = data[i] / 255;
    const y = cy + (val - 0.5) * h * 0.5 * intensity;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawTopography(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.topographyAmount;
  if (amount < 0.05) return;
  ctx.globalAlpha = amount;

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
    const alpha = Math.floor(8 + s.glow * 25).toString(16).padStart(2, "0");
    ctx.strokeStyle = getColor(r, s.palette, rows) + alpha;
    ctx.lineWidth = 0.5 + s.glow;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawParticles(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.particleAmount;
  if (amount < 0.05) return;
  ctx.globalAlpha = amount;

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
    ctx.globalAlpha = amount * (0.2 + val * 0.6 * s.audioSensitivity);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawGrid(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, s: InterpolatedState,
) {
  const amount = s.gridAmount;
  if (amount < 0.05) return;
  ctx.globalAlpha = amount;

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
    const alpha = Math.floor(10 + s.glow * 15).toString(16).padStart(2, "0");
    ctx.strokeStyle = getColor(r, s.palette, rows) + alpha;
    ctx.lineWidth = 0.3 + s.glow * 0.5;
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
    const alpha = Math.floor(10 + s.glow * 15).toString(16).padStart(2, "0");
    ctx.strokeStyle = getColor(c, s.palette, cols) + alpha;
    ctx.lineWidth = 0.3 + s.glow * 0.5;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
