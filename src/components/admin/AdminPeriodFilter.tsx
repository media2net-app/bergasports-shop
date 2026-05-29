"use client";

import {
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardPeriod,
} from "@/lib/dashboard-period";

type Props = {
  value: DashboardPeriod;
  onChange: (next: DashboardPeriod) => void;
};

export default function AdminPeriodFilter({ value, onChange }: Props) {
  return (
    <div className="admin-period-filter" role="group" aria-label="Period">
      {DASHBOARD_PERIOD_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`admin-period-filter-btn${value === option.id ? " is-active" : ""}`}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
