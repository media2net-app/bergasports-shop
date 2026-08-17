export type DashboardPeriod = "today" | "7d" | "30d" | "year" | "all";

export const DASHBOARD_PERIOD_STORAGE_KEY = "admin-dashboard-period";

export const DASHBOARD_PERIOD_OPTIONS: { id: DashboardPeriod; label: string }[] = [
  { id: "today", label: "Vandaag" },
  { id: "7d", label: "Laatste 7 dagen" },
  { id: "30d", label: "Laatste 30 dagen" },
  { id: "year", label: "Dit jaar" },
  { id: "all", label: "Alles" },
];

export function parseStoredDashboardPeriod(raw: string | null): DashboardPeriod {
  if (raw === "today" || raw === "7d" || raw === "30d" || raw === "year" || raw === "all") {
    return raw;
  }
  return "all";
}

function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDashboardPeriodRange(period: DashboardPeriod): { start: Date | null; end: Date | null } {
  const today = startOfLocalDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (period) {
    case "today":
      return { start: today, end: tomorrow };
    case "7d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: tomorrow };
    }
    case "30d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: tomorrow };
    }
    case "year":
      return { start: new Date(today.getFullYear(), 0, 1), end: tomorrow };
    case "all":
    default:
      return { start: null, end: null };
  }
}

export function isDateInDashboardPeriod(date: Date, period: DashboardPeriod): boolean {
  const { start, end } = getDashboardPeriodRange(period);
  if (!start) {
    return true;
  }
  if (date < start) {
    return false;
  }
  if (end && date >= end) {
    return false;
  }
  return true;
}

export function getDashboardPeriodLabel(period: DashboardPeriod): string {
  return DASHBOARD_PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? "Alles";
}
