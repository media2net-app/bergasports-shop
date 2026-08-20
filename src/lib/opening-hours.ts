import type { OpeningHoursRow } from "@/lib/site-content";

export type { OpeningHoursRow };

export type OpeningHoursPeriod = { opens: string; closes: string };

const PERIOD_RE = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/;

/** Parse open slots from `hours` (supports `12:30 – 17:30 · 19:00 – 21:00`) or opens/closes. */
export function periodsForOpeningHoursRow(row: OpeningHoursRow): OpeningHoursPeriod[] {
  if (row.hours === "Gesloten" || row.hours === "Closed") {
    return [];
  }
  const fromLabel = row.hours
    .split("·")
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(PERIOD_RE);
      return match ? { opens: match[1], closes: match[2] } : null;
    })
    .filter((period): period is OpeningHoursPeriod => Boolean(period));
  if (fromLabel.length > 0) {
    return fromLabel;
  }
  if (row.opens && row.closes) {
    return [{ opens: row.opens, closes: row.closes }];
  }
  return [];
}

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
      } else if (hours !== "Gesloten") {
        const periods = periodsForOpeningHoursRow({ ...next, opens, closes });
        if (periods[0]) {
          next.opens = periods[0].opens;
          next.closes = periods[0].closes;
        }
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
  return Boolean(row && periodsForOpeningHoursRow(row).length > 0);
}
