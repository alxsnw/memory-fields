export interface VisualPreset {
  name: string;
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
  compatibleNext: string[];
}

export const PRESETS: Record<string, VisualPreset> = {
  "membrane-soft-cyan": {
    name: "Membrane Soft Cyan",
    palette: ["#78DFFF", "#A4E8FF", "#D4F4FF", "#8AB8D4", "#5A8FA8", "#3A6A80"],
    membraneAmount: 0.85,
    topographyAmount: 0.05,
    particleAmount: 0.25,
    gridAmount: 0.0,
    glow: 0.7,
    blur: 0.6,
    speed: 0.3,
    density: 0.4,
    randomness: 0.2,
    audioSensitivity: 0.6,
    bassSensitivity: 0.7,
    midSensitivity: 0.4,
    highSensitivity: 0.3,
    colorDrift: 0.15,
    lineDensity: 0.3,
    fieldScale: 0.8,
    compatibleNext: ["topographic-slow-drift", "aurora-warm-gold", "particle-memory-sparse"],
  },
  "membrane-deep-violet": {
    name: "Membrane Deep Violet",
    palette: ["#A78BFA", "#8B6FD8", "#C4B5FD", "#6D4F9A", "#4A3570", "#7C3AED"],
    membraneAmount: 0.9,
    topographyAmount: 0.1,
    particleAmount: 0.2,
    gridAmount: 0.0,
    glow: 0.75,
    blur: 0.65,
    speed: 0.25,
    density: 0.35,
    randomness: 0.25,
    audioSensitivity: 0.55,
    bassSensitivity: 0.6,
    midSensitivity: 0.5,
    highSensitivity: 0.35,
    colorDrift: 0.2,
    lineDensity: 0.25,
    fieldScale: 0.75,
    compatibleNext: ["signal-field-minimal", "spectral-grid-subtle"],
  },
  "aurora-warm-gold": {
    name: "Aurora Warm Gold",
    palette: ["#FFD640", "#FFB347", "#FF8C42", "#EAA21A", "#D4874A", "#C07A3A"],
    membraneAmount: 0.6,
    topographyAmount: 0.4,
    particleAmount: 0.5,
    gridAmount: 0.1,
    glow: 0.8,
    blur: 0.7,
    speed: 0.4,
    density: 0.5,
    randomness: 0.35,
    audioSensitivity: 0.7,
    bassSensitivity: 0.5,
    midSensitivity: 0.6,
    highSensitivity: 0.5,
    colorDrift: 0.3,
    lineDensity: 0.4,
    fieldScale: 0.85,
    compatibleNext: ["membrane-soft-cyan", "topographic-slow-drift", "particle-memory-sparse"],
  },
  "topographic-slow-drift": {
    name: "Topographic Slow Drift",
    palette: ["#78DFFF", "#34D67B", "#A5A298", "#4F574E", "#98A08F", "#DDD8CD"],
    membraneAmount: 0.35,
    topographyAmount: 0.8,
    particleAmount: 0.35,
    gridAmount: 0.12,
    glow: 0.55,
    blur: 0.4,
    speed: 0.2,
    density: 0.6,
    randomness: 0.4,
    audioSensitivity: 0.5,
    bassSensitivity: 0.8,
    midSensitivity: 0.3,
    highSensitivity: 0.2,
    colorDrift: 0.25,
    lineDensity: 0.7,
    fieldScale: 0.9,
    compatibleNext: ["particle-memory-sparse", "signal-field-minimal"],
  },
  "particle-memory-sparse": {
    name: "Particle Memory Sparse",
    palette: ["#F5FAFF", "#A78BFA", "#FF5C8A", "#34D67B", "#EAA21A", "#78DFFF"],
    membraneAmount: 0.2,
    topographyAmount: 0.15,
    particleAmount: 0.85,
    gridAmount: 0.05,
    glow: 0.6,
    blur: 0.3,
    speed: 0.5,
    density: 0.3,
    randomness: 0.6,
    audioSensitivity: 0.8,
    bassSensitivity: 0.4,
    midSensitivity: 0.7,
    highSensitivity: 0.8,
    colorDrift: 0.35,
    lineDensity: 0.2,
    fieldScale: 0.7,
    compatibleNext: ["aurora-warm-gold", "topographic-slow-drift"],
  },
  "signal-field-minimal": {
    name: "Signal Field",
    palette: ["#F5FAFF", "#A78BFA", "#78DFFF", "#EAA21A", "#34D67B", "#FF5C8A"],
    membraneAmount: 0.7,
    topographyAmount: 0.45,
    particleAmount: 0.5,
    gridAmount: 0.55,
    glow: 0.75,
    blur: 0.3,
    speed: 0.45,
    density: 0.6,
    randomness: 0.35,
    audioSensitivity: 0.85,
    bassSensitivity: 0.7,
    midSensitivity: 0.65,
    highSensitivity: 0.7,
    colorDrift: 0.3,
    lineDensity: 0.6,
    fieldScale: 1.0,
    compatibleNext: ["spectral-grid-subtle", "aurora-warm-gold", "particle-memory-sparse"],
  },
  "spectral-grid-subtle": {
    name: "Spectral Grid Subtle",
    palette: ["#37E6F2", "#C64CFF", "#F03DCE", "#EAA21A", "#34D67B", "#F2554D"],
    membraneAmount: 0.25,
    topographyAmount: 0.25,
    particleAmount: 0.25,
    gridAmount: 0.8,
    glow: 0.6,
    blur: 0.25,
    speed: 0.45,
    density: 0.55,
    randomness: 0.35,
    audioSensitivity: 0.7,
    bassSensitivity: 0.3,
    midSensitivity: 0.5,
    highSensitivity: 0.9,
    colorDrift: 0.4,
    lineDensity: 0.6,
    fieldScale: 0.85,
    compatibleNext: ["signal-field-minimal", "membrane-soft-cyan"],
  },
};

export const PRESET_KEYS = Object.keys(PRESETS);

export function getPreset(name: string): VisualPreset {
  return PRESETS[name] || PRESETS["membrane-soft-cyan"];
}

export function pickCompatibleNext(current: string, seed: number): string {
  const preset = getPreset(current);
  const compat = preset.compatibleNext;
  if (compat.length === 0) {
    const others = PRESET_KEYS.filter((k) => k !== current);
    return others[Math.floor(seededRandom(seed) * others.length)];
  }
  return compat[Math.floor(seededRandom(seed + 1) * compat.length)];
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function getPresetBySeed(seed: number): string {
  const idx = Math.floor(seededRandom(seed) * PRESET_KEYS.length);
  return PRESET_KEYS[idx];
}
