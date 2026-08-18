import type { OpeningHoursRow } from "@/lib/site-content";

export type { OpeningHoursRow };

export function parseOpeningHoursJson(raw: string, fallback: OpeningHoursRow[]): OpeningHoursRow[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return fallback;
    }
    return parsed.map((item, index) => {
      const row = item as Partial<OpeningHoursRow>;
      const base = fallback[index];
      const hours = String(row.hours ?? base?.hours ?? "Gesloten").trim() || "Gesloten";
      const opens = typeof row.opens === "string" ? row.opens.trim() : "";
      const closes = typeof row.closes === "string" ? row.closes.trim() : "";
      const next: OpeningHoursRow = {
        day: String(row.day ?? base?.day ?? "").trim() || base?.day || `Dag ${index + 1}`,
        schemaDay: String(row.schemaDay ?? base?.schemaDay ?? "Monday").trim() || "Monday",
        hours,
      };
      if (hours !== "Gesloten" && opens && closes) {
        next.opens = opens;
        next.closes = closes;
      }
      return next;
    });
  } catch {
    return fallback;
  }
}

export function serializeOpeningHours(rows: OpeningHoursRow[]): string {
  return JSON.stringify(rows);
}

const SCHEMA_DAY_TO_JS: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function hoursForJsWeekday(hours: OpeningHoursRow[], jsDay: number): OpeningHoursRow | undefined {
  return hours.find((row) => SCHEMA_DAY_TO_JS[row.schemaDay] === jsDay);
}

export function isShopOpenOnJsWeekday(hours: OpeningHoursRow[], jsDay: number): boolean {
  const row = hoursForJsWeekday(hours, jsDay);
  return Boolean(row && row.hours !== "Gesloten" && row.opens && row.closes);
}
