import Link from "next/link";
import type { ReactNode } from "react";

type AdminKpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  highlight?: boolean;
};

export default function AdminKpiCard({ label, value, hint, href, highlight }: AdminKpiCardProps) {
  const card = (
    <div className={`admin-kpi-card${highlight ? " is-highlight" : ""}`}>
      <p className="admin-kpi-label">{label}</p>
      <p className="admin-kpi-value">{value}</p>
      {hint ? <p className="admin-kpi-hint">{hint}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="admin-kpi-card-link">
        {card}
      </Link>
    );
  }

  return card;
}
