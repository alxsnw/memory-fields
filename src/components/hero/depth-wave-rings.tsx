"use client";

const RINGS = [
  { delay: 0, duration: 13, size: 130, peakOpacity: 0.035 },
  { delay: 4, duration: 14, size: 100, peakOpacity: 0.025 },
  { delay: 8, duration: 12, size: 150, peakOpacity: 0.04 },
  { delay: 12.5, duration: 15, size: 110, peakOpacity: 0.03 },
];

export function DepthWaveRings() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {RINGS.map((ring, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full border border-white/60"
          style={{
            width: ring.size,
            height: ring.size,
            marginLeft: -ring.size / 2,
            marginTop: -ring.size / 2,
            opacity: ring.peakOpacity,
            borderWidth: 0.5,
            animation: `depth-wave ${ring.duration}s ease-out infinite`,
            animationDelay: `${ring.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
