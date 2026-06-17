"use client";

const RINGS = [
  { delay: 0, duration: 10, size: 180, startOpacity: 0.06 },
  { delay: 2.8, duration: 11, size: 140, startOpacity: 0.05 },
  { delay: 5.5, duration: 9.5, size: 200, startOpacity: 0.08 },
  { delay: 8.3, duration: 12, size: 120, startOpacity: 0.04 },
  { delay: 11, duration: 10.5, size: 160, startOpacity: 0.07 },
];

export function DepthWaveRings() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {RINGS.map((ring, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full border border-white"
          style={{
            width: ring.size,
            height: ring.size,
            marginLeft: -ring.size / 2,
            marginTop: -ring.size / 2,
            opacity: ring.startOpacity,
            borderWidth: 1,
            animation: `depth-wave ${ring.duration}s cubic-bezier(0.18, 0.46, 0.12, 1) infinite`,
            animationDelay: `${ring.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
