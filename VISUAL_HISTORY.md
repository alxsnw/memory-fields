# Memory Fields — Visual History

This document tracks the evolution of each visual mode.
Purpose: prevent accidental regression and preserve successful visual states.

---

## Spatial Rhythm

### Baseline (Current)

| | |
|---|---|
| Commit | `39d02ea` |
| Date | 2026-06-22 |
| Status | Current production |

**Parameters:**
- lowRaw = bass * 2.5, smoothed with attack 0.4 / release 0.08
- kickPulse = transient detection * 3
- amplitude = bass * 80 + low * 60 + kick * 40
- lineWidth = 1.5 + low * 4
- arc radius = (1 + drive*0.8 + tr*0.5)
- breathe = 1 + (low * 0.6 + kick * 0.4)
- isolated low-end processing, no dataArray mutation

**Notes:**
- Audio-driven breathing, transient detection for kicks
- Less time-based oscillation, more audio-reactive

### A — Original (v1)

| | |
|---|---|
| Commit | `87ec683` |
| Date | 2026-06-17 |

**Parameters:**
- amplitude = bass * 80 + mids * 40
- lineWidth = 1.5 + bass * 2
- arc radius = (1 + bass * 0.5)
- arc alpha = 0.1 + avg * 0.25
- particle drift = bass * 30

**Notes:**
- Pure frequency-bin driven, no envelope smoothing
- Clean, predictable motion
- First version after initial crossfade system

### B — Low-end envelope v1 (v2)

| | |
|---|---|
| Commit | `f8d0352` |
| Date | 2026-06-22 |

**Parameters:**
- drive = bass + low * 0.5 + tr * 0.3
- amplitude = drive * 120
- lineWidth = 1.5 + drive * 3
- arc radius = (1 + drive*0.8 + tr*0.5)

**Notes:**
- First introduction of __lowEnergy/__transient globals
- Moderate boost, still subtle
- Envelope smoothing applied globally via dataArray injection

### C — Aggressive drive (v3)

| | |
|---|---|
| Commit | `b3bb43b` |
| Date | 2026-06-22 |

**Parameters:**
- lo = __lowEnergy * 2, tr = __transient * 3
- drive = min(1, bass + lo + tr)
- amplitude = drive * 200
- lineWidth = 1.5 + drive * 6
- arc radius = (1 + drive*1.5 + tr*2)
- arc alpha = + tr * 0.5

**Notes:**
- Very aggressive multipliers
- Noticeable but felt unnatural / overdriven
- Same global envelope system as v2

---

## Signal Field

**Status: PROTECTED / HERO**

| | |
|---|---|
| Baseline commit | `c747eaa` |
| Config | `signalFieldConfig` (boost: 1.8, contrast: 1.3) |

Signal Field is the first visual mode users see. It must remain strong and impressive.

---

## Particle Memory

**Status: WIP**

| | |
|---|---|
| Baseline commit | `b33664f` |
| Current commit | `f8d0352` |

---

## Noise Memory

**Status: EXPERIMENTAL**

| | |
|---|---|
| Introduced | `5a206e0` |

---

## Visual Preservation Policy

1. Each visual mode has a BASELINE and EXPERIMENTAL status
2. Experiments must never overwrite baseline implementation
3. Baseline modes are protected from accidental modification
4. Config values in `rendererConfigs` are the source of truth
5. New visual work must be done in `/lab` routes
6. Only visually accepted modes should be merged into production
