type GoldStarsProps = {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
} as const;

const STAR_PATH =
  "M10 1.6 12.4 7l5.9.5-4.5 3.8 1.4 5.7L10 13.9 4.8 17l1.4-5.7L1.7 7.5 7.6 7 10 1.6Z";

function Star({ fill, size }: { fill: number; size: GoldStarsProps["size"] }) {
  const pct = Math.round(Math.min(1, Math.max(0, fill)) * 100);
  const box = SIZES[size ?? "md"];
  return (
    <span className={`relative inline-block ${box}`}>
      <svg viewBox="0 0 20 20" className={`${box} fill-current opacity-25`} aria-hidden>
        <path d={STAR_PATH} />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <svg viewBox="0 0 20 20" className={`${box} fill-current`} aria-hidden>
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

export default function GoldStars({ rating, size = "md", className = "" }: GoldStarsProps) {
  const clamped = Math.min(5, Math.max(0, rating));
  const label = `${clamped.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} van 5 sterren`;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[var(--brand-mid)] ${className}`} aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} fill={clamped - index} size={size} />
      ))}
    </span>
  );
}
