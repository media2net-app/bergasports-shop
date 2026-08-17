import Link from "next/link";
import type { ReactNode } from "react";

type IconTone = "default" | "brand" | "success" | "warning";

type AdminMetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  badge?: string;
  href?: string;
  highlight?: boolean;
  hero?: boolean;
  icon?: ReactNode;
  iconTone?: IconTone;
  featured?: boolean;
};

export default function AdminMetricCard({
  label,
  value,
  hint,
  badge,
  href,
  highlight,
  hero,
  featured,
  icon,
  iconTone = "default",
}: AdminMetricCardProps) {
  const card = (
    <div
      className={`admin-metric-card${highlight ? " is-highlight" : ""}${hero ? " is-hero" : ""}${featured ? " is-featured" : ""}`}
    >
      <div className="admin-metric-card-top">
        <p className="admin-metric-label">{label}</p>
        {icon ? (
          <span className={`admin-metric-icon${iconTone !== "default" ? ` admin-metric-icon--${iconTone}` : ""}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="admin-metric-value">{value}</p>
      {hint ? <p className="admin-metric-hint">{hint}</p> : null}
      {badge ? (
        <span className={`admin-metric-badge${highlight ? " admin-metric-badge--warn" : ""}`}>{badge}</span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="admin-metric-card-link">
        {card}
      </Link>
    );
  }

  return card;
}
