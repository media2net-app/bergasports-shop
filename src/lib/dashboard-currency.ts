export type DashboardDisplayCurrency = "RON" | "EUR";

export const DASHBOARD_CURRENCY_STORAGE_KEY = "admin-dashboard-currency";

const DEFAULT_RON_PER_EUR = 4.97;

export function getRonPerEur(): number {
  const raw = process.env.NEXT_PUBLIC_ADMIN_RON_PER_EUR ?? process.env.ADMIN_RON_PER_EUR;
  const parsed = raw ? Number.parseFloat(raw) : DEFAULT_RON_PER_EUR;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RON_PER_EUR;
}

export function convertRonAmount(amountRon: number, display: DashboardDisplayCurrency, ronPerEur: number): number {
  if (display === "RON") {
    return amountRon;
  }
  return amountRon / ronPerEur;
}

export function formatDashboardMoney(
  amountRon: number,
  display: DashboardDisplayCurrency,
  ronPerEur: number,
): string {
  const value = convertRonAmount(amountRon, display, ronPerEur);
  if (display === "EUR") {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseStoredDashboardCurrency(raw: string | null): DashboardDisplayCurrency {
  return raw === "EUR" ? "EUR" : "RON";
}
