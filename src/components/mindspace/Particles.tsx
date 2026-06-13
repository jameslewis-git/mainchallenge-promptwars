import { useMemo } from "react";

export function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 14 + Math.random() * 18,
        delay: Math.random() * 20,
        color: Math.random() > 0.5 ? "#7B2FBE" : "#00D4AA",
      })),
    [],
  );
  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            bottom: `-10px`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `floatParticle ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
