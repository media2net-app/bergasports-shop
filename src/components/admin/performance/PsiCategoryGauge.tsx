/** Lighthouse / PageSpeed Insights category gauge (partial arc). */

export type PsiScoreTone = "good" | "ok" | "poor" | "empty";

export function psiScoreTone(score: number | null): PsiScoreTone {
  if (score == null) {
    return "empty";
  }
  if (score >= 90) {
    return "good";
  }
  if (score >= 50) {
    return "ok";
  }
  return "poor";
}

const TONE_STROKE: Record<PsiScoreTone, string> = {
  good: "#0cce6b",
  ok: "#ffa400",
  poor: "#ff4e42",
  empty: "#9aa0a6",
};

const R = 45;
const C = 2 * Math.PI * R;
/** 270° arc (Lighthouse-style open gauge). */
const ARC = C * 0.75;

type PsiCategoryGaugeProps = {
  score: number | null;
  label: string;
  className?: string;
};

export default function PsiCategoryGauge({ score, label, className = "" }: PsiCategoryGaugeProps) {
  const tone = psiScoreTone(score);
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 0;
  const filled = (pct / 100) * ARC;
  const stroke = TONE_STROKE[tone];

  return (
    <figure
      className={`psi-gauge ${className}`.trim()}
      aria-label={score != null ? `${label}: ${score}` : label}
    >
      <svg className="psi-gauge-svg" viewBox="0 0 120 80" width="96" height="64" aria-hidden>
        <g transform="translate(60, 60) rotate(135)">
          <circle
            className="psi-gauge-track"
            r={R}
            fill="none"
            stroke="#e8eaed"
            strokeWidth={8}
            strokeDasharray={`${ARC} ${C}`}
            strokeLinecap="round"
          />
          <circle
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth={8}
            strokeDasharray={`${filled} ${C}`}
            strokeLinecap="round"
          />
        </g>
        <text
          className="psi-gauge-score"
          x="60"
          y="54"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={stroke}
        >
          {score ?? "—"}
        </text>
      </svg>
      <figcaption className="psi-gauge-label">{label}</figcaption>
    </figure>
  );
}
