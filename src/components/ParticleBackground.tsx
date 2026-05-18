export function ParticleBackground() {
  const dots = Array.from({ length: 30 });
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      {dots.map((_, i) => {
        const size = Math.random() * 3 + 1;
        const delay = Math.random() * 6;
        const duration = 8 + Math.random() * 10;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-primary/40"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              animation: `float ${duration}s ease-in-out ${delay}s infinite`,
              boxShadow: "0 0 12px var(--glow)",
            }}
          />
        );
      })}
    </div>
  );
}
