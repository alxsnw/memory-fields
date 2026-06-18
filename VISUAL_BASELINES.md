# Visual Baselines

## Protected Modes

These modes are accepted and must not change without explicit request.

### Signal Field — PROTECTED / HERO MODE

Signal Field is the first visual model users see. It must remain strong and impressive.

| Property | Accepted value |
|---|---|
| Brightness | Strong — layer alpha boosted 1.8x via `signalFieldConfig.boost` |
| Contrast | Enhanced — config `contrast: 1.3`, `lineWidth: 1.2`, `glow: 1.2` |
| Density | Driven by journey presets, responsive to Density slider |
| Motion | Continuous orbital drift + audio-reactive ripples |
| Decay | Accumulation decay 0.985 (slow trail fade) |
| Core Trace | Controls membrane opacity 0–1; default 1 (fully visible) |
| Crossfade | Only active mode renders at full alpha; previous mode fades out |
| Config source | `signalFieldConfig` in `canvas-visualizer.tsx` |

What must not change without explicit approval:
- `boost` factor (currently 1.8) — controls overall layer visibility
- `contrast` (currently 1.3) — controls line/contour contrast
- `accumDecay` (currently 0.985)
- `opacity`, `lineWidth`, `glow`, `densityScale`, `audioMapStrength`
- Any FLOORS value used by Signal Field
- The `alphaFor` crossfade logic
- Accumulation canvas alpha pipeline when activeVisualMode is signal-field

### Spatial Rhythm — PROTECTED

| Property | Accepted value |
|---|---|
| Brightness | Full — waves, arcs, and particles all visible |
| Density | Driven by journey presets, responsive to Density slider |
| Motion | Horizontal waves + arc pulses + floating particles |
| Contrast | Line alpha floor 0.08, particle alpha floor 0.06 |
| Decay | Accumulation decay 0.985 (slow trail fade) |
| Crossfade | Only active mode renders at full alpha; previous mode fades out |
| Config source | `spatialRhythmConfig` in `canvas-visualizer.tsx` |
| What must not change | Wave amplitude, arc sweep, particle count scaling, accumulation decay |

## Work in Progress

### Particle Memory — WIP

This mode is still under development and may change.

| Property | Current value |
|---|---|
| Status | Active but WIP |
| Particle color | White (#eaedf2) |
| Trails | Core Trace controls persistence (0.92–0.99 decay) |
| Connections | Rare, local, density-gated |
| Motion | Flow-field driven (orbital + audio-reactive) |
| Config source | `particleMemoryConfig` in `canvas-visualizer.tsx` |
| Changes allowed | Any, as long as protected modes are not affected |

## Change Policy

1. Protected modes (Signal Field, Spatial Rhythm) must be visually verified before merge.
2. Any change to shared canvas pipeline (accumulation canvas, crossfade, alpha, DPR, resolution) must be tested against all protected modes.
3. Particle Memory changes must never modify `signalFieldConfig` or `spatialRhythmConfig`.
4. Config values in `rendererConfigs` are the source of truth for per-renderer behavior.
5. Adding new fields to `RendererConfig` must not change existing renderer behavior without explicit approval.
6. Lab development (`/lab/*`) is the correct place to prototype visual changes before merging.
