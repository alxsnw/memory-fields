"use client";

import { useEffect, useRef, useCallback } from "react";
import type { VisualModel, PaletteMode, VisualParams } from "@/types";

interface CanvasVisualizerProps {
  model: VisualModel;
  paletteMode: PaletteMode;
  params: VisualParams;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

const MINERAL_PALETTE = ["#F5FAFF", "#DDD8CD", "#98A08F", "#A5A298", "#4F574E", "#A68A63"];
const SPECTRAL_PALETTE = ["#37E6F2", "#C64CFF", "#F03DCE", "#EAA21A", "#34D67B", "#F2554D"];

function getColor(i: number, palette: string[], count: number): string {
  return palette[Math.floor((i / count) * palette.length) % palette.length];
}

export function CanvasVisualizer({ model, paletteMode, params, analyserNode, isPlaying }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const palette = paletteMode === "spectral" ? SPECTRAL_PALETTE : MINERAL_PALETTE;

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

    if (!analyserNode || !isPlaying) {
      // Idle state - subtle ambient
      drawIdle(ctx, w, h, now, palette);
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    const avgAmplitude = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;

    switch (model) {
      case "signal-field":
        drawSignalField(ctx, w, h, dataArray, bufferLength, avgAmplitude, now, dt, params, palette);
        break;
      case "spatial-rhythm":
        drawSpatialRhythm(ctx, w, h, dataArray, bufferLength, avgAmplitude, now, dt, params, palette);
        break;
      case "particle-memory":
        drawParticleMemory(ctx, w, h, dataArray, bufferLength, avgAmplitude, now, dt, params, palette);
        break;
      case "topographic-wave":
        drawTopographicWave(ctx, w, h, dataArray, bufferLength, avgAmplitude, now, dt, params, palette);
        break;
      case "orbital-spectrum":
        drawOrbitalSpectrum(ctx, w, h, dataArray, bufferLength, avgAmplitude, now, dt, params, palette);
        break;
      case "spectral-grid":
        drawSpectralGrid(ctx, w, h, dataArray, bufferLength, avgAmplitude, now, dt, params, palette);
        break;
      case "ascii-field":
        drawAsciiField(ctx, w, h, dataArray, bufferLength, avgAmplitude, now, dt, params, palette);
        break;
    }

    animRef.current = requestAnimationFrame(draw);
  }, [model, paletteMode, params, analyserNode, isPlaying]);

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

function drawIdle(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, palette: string[]) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.15;

  for (let i = 0; i < 3; i++) {
    const phase = now * 0.3 + i * 2.1;
    const x = cx + Math.cos(phase) * r * 0.5;
    const y = cy + Math.sin(phase * 0.7) * r * 0.5;
    const radius = r * (0.3 + Math.sin(now * 0.2 + i) * 0.1);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = palette[i] + "08";
    ctx.fill();
  }
}

function drawSignalField(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, params: VisualParams, palette: string[],
) {
  const intensity = params.intensity / 100;
  const speed = params.speed / 100;
  const cx = w / 2;
  const cy = h / 2;
  const bands = Math.min(len, 128);
  const step = len / bands;

  ctx.globalAlpha = 0.3 + avg * 0.7;

  for (let b = 0; b < bands; b++) {
    const i = Math.floor(b * step);
    const val = data[i] / 255;
    const angle = (b / bands) * Math.PI * 2 + now * speed * 0.2;
    const radius = Math.min(w, h) * 0.35 * (0.2 + val * 0.8 * intensity);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.arc(x, y, 1 + val * 3, 0, Math.PI * 2);
    ctx.fillStyle = getColor(b, palette, bands);
    ctx.fill();
  }

  // Waveform lines
  ctx.strokeStyle = palette[0] + "20";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < len; i++) {
    const x = (i / len) * w;
    const val = data[i] / 255;
    const y = cy + (val - 0.5) * h * 0.6 * intensity;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawSpatialRhythm(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, params: VisualParams, palette: string[],
) {
  const intensity = params.intensity / 100;
  const speed = params.speed / 100;
  const density = params.density / 100;
  const cx = w / 2;
  const cy = h / 2;
  const count = Math.floor(6 + density * 12);
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);

  for (let i = 0; i < count; i++) {
    const phase = now * speed * 0.3 + i * (Math.PI * 2 / count) * 3.7;
    const freq = 0.4 + (i / count) * 0.8;
    const amp = 0.15 + intensity * 0.35 * (0.3 + bass * 0.7);
    const r = Math.min(w, h) * amp;
    const x = cx + Math.cos(phase * freq) * r;
    const y = cy + Math.sin(phase * freq * 1.3) * r;

    ctx.beginPath();
    ctx.arc(x, y, 2 + (data[i % len] / 255) * 4, 0, Math.PI * 2);
    ctx.fillStyle = getColor(i, palette, count);
    ctx.globalAlpha = 0.3 + (data[i % len] / 255) * 0.7;
    ctx.fill();

    // Trail
    for (let t = 1; t < 8; t++) {
      const tp = phase - t * 0.05 * dt * 30;
      const tx = cx + Math.cos(tp * freq) * r;
      const ty = cy + Math.sin(tp * freq * 1.3) * r;
      ctx.beginPath();
      ctx.arc(tx, ty, 1, 0, Math.PI * 2);
      ctx.fillStyle = getColor(i, palette, count);
      ctx.globalAlpha = 0.1 / t;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawParticleMemory(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, params: VisualParams, palette: string[],
) {
  const intensity = params.intensity / 100;
  const density = params.density / 100;
  const memory = params.memory / 100;
  const count = Math.floor(20 + density * 60);
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);

  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const x = (w * 0.2) + (Math.sin(now * 0.1 + seed) * 0.5 + 0.5) * w * 0.6;
    const y = (h * 0.2) + (Math.cos(now * 0.08 + seed * 0.7) * 0.5 + 0.5) * h * 0.6;
    const val = data[i % len] / 255;
    const size = 1 + val * 4 * intensity;
    const pulseX = bass * 20 * (Math.sin(now * 2 + seed) - 0.5);
    const pulseY = bass * 20 * (Math.cos(now * 1.7 + seed * 1.1) - 0.5);

    ctx.beginPath();
    ctx.arc(x + pulseX, y + pulseY, size, 0, Math.PI * 2);
    ctx.fillStyle = getColor(i, palette, count);
    ctx.globalAlpha = 0.2 + val * 0.6 * intensity;
    ctx.fill();

    // Memory trails
    if (memory > 0.3) {
      for (let t = 1; t < Math.floor(memory * 6); t++) {
        const tp = now - t * 0.1;
        const tx = (w * 0.2) + (Math.sin(tp * 0.1 + seed) * 0.5 + 0.5) * w * 0.6;
        const ty = (h * 0.2) + (Math.cos(tp * 0.08 + seed * 0.7) * 0.5 + 0.5) * h * 0.6;
        ctx.beginPath();
        ctx.arc(tx, ty, size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = getColor(i, palette, count);
        ctx.globalAlpha = 0.05 * memory;
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawTopographicWave(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, params: VisualParams, palette: string[],
) {
  const intensity = params.intensity / 100;
  const density = params.density / 100;
  const speed = params.speed / 100;
  const cols = Math.floor(20 + density * 40);
  const rows = Math.floor(10 + density * 20);
  const cellW = w / cols;
  const cellH = h / rows;
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);

  for (let r = 0; r < rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      const idx = Math.floor((c / cols) * len);
      const val = data[idx] / 255;
      const elevation = bass * h * 0.15 * intensity + val * h * 0.08 * intensity;
      const y = r * cellH + elevation * Math.sin(now * speed * 0.5 + c * 0.3 + r * 0.7);
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = getColor(r, palette, rows) + (10 + intensity * 30).toString(16).padStart(2, "0");
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

function drawOrbitalSpectrum(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, params: VisualParams, palette: string[],
) {
  const intensity = params.intensity / 100;
  const density = params.density / 100;
  const cx = w / 2;
  const cy = h / 2;
  const rings = Math.floor(3 + density * 8);
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const baseRadius = Math.min(w, h) * 0.08;

  for (let ring = 0; ring < rings; ring++) {
    const r = baseRadius + (ring / rings) * Math.min(w, h) * 0.35 + bass * 30 * intensity;
    const points = Math.floor(20 + density * 60);

    ctx.beginPath();
    for (let p = 0; p <= points; p++) {
      const angle = (p / points) * Math.PI * 2 + now * (0.1 + ring * 0.03);
      const idx = Math.floor((p / points) * len);
      const val = data[idx] / 255;
      const rr = r + val * 15 * intensity * (ring + 1);
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = getColor(ring, palette, rings) + (20 + intensity * 40).toString(16).padStart(2, "0");
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawSpectralGrid(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, params: VisualParams, palette: string[],
) {
  const intensity = params.intensity / 100;
  const density = params.density / 100;
  const speed = params.speed / 100;
  const cols = Math.floor(10 + density * 30);
  const rows = Math.floor(8 + density * 20);
  const cellW = w / cols;
  const cellH = h / rows;
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const idx = Math.floor((c / cols) * len);
      const val = data[idx] / 255;
      const x = c * cellW + Math.sin(now * speed * 0.5 + r * 0.5) * bass * 20 * intensity;
      const y = r * cellH + Math.cos(now * speed * 0.4 + c * 0.5) * val * 15 * intensity;
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = getColor(r, palette, rows) + "15";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const idx = Math.floor((r / rows) * len);
      const val = data[idx] / 255;
      const x = c * cellW + Math.sin(now * speed * 0.5 + r * 0.5) * bass * 20 * intensity;
      const y = r * cellH + Math.cos(now * speed * 0.4 + c * 0.5) * val * 15 * intensity;
      r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = getColor(c, palette, cols) + "15";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

function drawAsciiField(
  ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number,
  avg: number, now: number, dt: number, params: VisualParams, palette: string[],
) {
  const intensity = params.intensity / 100;
  const density = params.density / 100;
  const glyphSize = Math.max(8, 14 - density * 6);
  const cols = Math.floor(w / glyphSize);
  const rows = Math.floor(h / glyphSize);
  const chars = [".", "·", "-", "_", "/", "\\", "{", "}", "[", "]", "<", ">", "*", "#", "░", "▒", "▓", "█"];
  const bass = data.slice(0, 4).reduce((a, b) => a + b, 0) / (4 * 255);
  const mid = data.slice(10, 20).reduce((a, b) => a + b, 0) / (10 * 255);

  ctx.font = `${glyphSize}px "IBM Plex Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let r = 0; r < rows; r += 2) {
    for (let c = 0; c < cols; c += 1) {
      const idx = Math.floor(((c + r * cols) / (cols * rows)) * len);
      const val = data[idx] / 255;
      const charIdx = Math.floor(((val + now * 0.05 * intensity) % 1) * chars.length);
      const char = chars[Math.max(0, Math.min(chars.length - 1, charIdx))];

      const x = c * glyphSize + glyphSize / 2;
      const y = r * glyphSize + glyphSize / 2;

      const displacement = bass * 6 * intensity * (Math.sin(now + c * 0.3 + r * 0.5) - 0.5);

      ctx.globalAlpha = 0.1 + val * 0.7 * intensity;
      ctx.fillStyle = getColor(c + r, palette, cols + rows);
      ctx.fillText(char, x + displacement, y + displacement * 0.3);
    }
  }
  ctx.globalAlpha = 1;
}
