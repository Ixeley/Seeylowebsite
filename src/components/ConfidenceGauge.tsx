interface Props { value: number; size?: number }
export function ConfidenceGauge({ value, size = 140 }: Props) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = value >= 80 ? "var(--bullish)" : value >= 60 ? "var(--primary)" : "var(--bearish)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} stroke="oklch(1 0 0 / 0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke="url(#gaugeGrad)" strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out", filter: "drop-shadow(0 0 8px var(--glow))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gradient">{value}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</span>
      </div>
    </div>
  );
}
