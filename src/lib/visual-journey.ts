import { getPreset, pickCompatibleNext, getPresetBySeed, type VisualPreset } from "./presets";

export type JourneyPhase = "idle" | "transitioning" | "holding";

export interface JourneyState {
  phase: JourneyPhase;
  startPreset: string;
  targetPreset: string;
  startTime: number;
  transitionDuration: number;
  progress: number;
  roomSeed: number;
  isPlaying: boolean;
}

export interface InterpolatedState {
  palette: string[];
  membraneAmount: number;
  topographyAmount: number;
  particleAmount: number;
  gridAmount: number;
  glow: number;
  blur: number;
  speed: number;
  density: number;
  randomness: number;
  audioSensitivity: number;
  bassSensitivity: number;
  midSensitivity: number;
  highSensitivity: number;
  colorDrift: number;
  lineDensity: number;
  fieldScale: number;
}

export function createJourney(roomSeed: number, isPlaying: boolean): JourneyState {
  const initialPreset = getPresetBySeed(roomSeed);
  const target = pickCompatibleNext(initialPreset, roomSeed);
  return {
    phase: isPlaying ? "transitioning" : "idle",
    startPreset: initialPreset,
    targetPreset: target,
    startTime: Date.now(),
    transitionDuration: isPlaying ? 300_000 : 600_000,
    progress: 0,
    roomSeed,
    isPlaying,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolatePalette(a: string[], b: string[], t: number): string[] {
  return a.map((color, i) => {
    const targetColor = b[i % b.length];
    return lerpHex(color, targetColor, t);
  });
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  const r1 = parseInt(hexA.slice(1, 3), 16);
  const g1 = parseInt(hexA.slice(3, 5), 16);
  const b1 = parseInt(hexA.slice(5, 7), 16);
  const r2 = parseInt(hexB.slice(1, 3), 16);
  const g2 = parseInt(hexB.slice(3, 5), 16);
  const b2 = parseInt(hexB.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function getInterpolatedState(journey: JourneyState): InterpolatedState {
  const start = getPreset(journey.startPreset);
  const target = getPreset(journey.targetPreset);
  const rawT = journey.transitionDuration > 0
    ? Math.min(1, (Date.now() - journey.startTime) / journey.transitionDuration)
    : 0;
  const t = easeInOutCubic(rawT);

  const num = (key: keyof VisualPreset) => lerp(start[key] as number, target[key] as number, t);

  return {
    palette: interpolatePalette(start.palette, target.palette, t),
    membraneAmount: num("membraneAmount"),
    topographyAmount: num("topographyAmount"),
    particleAmount: num("particleAmount"),
    gridAmount: num("gridAmount"),
    glow: num("glow"),
    blur: num("blur"),
    speed: num("speed"),
    density: num("density"),
    randomness: num("randomness"),
    audioSensitivity: num("audioSensitivity"),
    bassSensitivity: num("bassSensitivity"),
    midSensitivity: num("midSensitivity"),
    highSensitivity: num("highSensitivity"),
    colorDrift: num("colorDrift"),
    lineDensity: num("lineDensity"),
    fieldScale: num("fieldScale"),
  };
}

export function tickJourney(journey: JourneyState): JourneyState {
  const elapsed = Date.now() - journey.startTime;
  const progress = journey.transitionDuration > 0
    ? Math.min(1, elapsed / journey.transitionDuration)
    : 0;

  if (progress >= 1 && journey.phase === "transitioning") {
    const nextTarget = pickCompatibleNext(journey.targetPreset, journey.roomSeed + Math.floor(elapsed / 300_000));
    return {
      ...journey,
      phase: journey.isPlaying ? "transitioning" : "holding",
      startPreset: journey.targetPreset,
      targetPreset: nextTarget,
      startTime: Date.now(),
      transitionDuration: journey.isPlaying ? 300_000 : 600_000,
      progress: 0,
    };
  }

  return { ...journey, progress };
}

export function updateJourneyPlayState(journey: JourneyState, isPlaying: boolean): JourneyState {
  if (isPlaying && !journey.isPlaying) {
    return {
      ...journey,
      phase: "transitioning",
      transitionDuration: 300_000,
      isPlaying: true,
      startTime: Date.now(),
    };
  }
  if (!isPlaying && journey.isPlaying) {
    return {
      ...journey,
      phase: "idle",
      transitionDuration: 600_000,
      isPlaying: false,
      startTime: Date.now(),
    };
  }
  return journey;
}
