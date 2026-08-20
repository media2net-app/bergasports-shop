import {
  hoursForJsWeekday,
  isShopOpenOnJsWeekday,
  periodsForOpeningHoursRow,
  type OpeningHoursRow,
} from "@/lib/opening-hours";

export type DateTimePickerMode = "date" | "datetime" | "time";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function todayYmd(now = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function splitDateTimeValue(value: string): { date: string; time: string } {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}/.test(trimmed) && !trimmed.includes("T")) {
    return { date: "", time: trimmed.slice(0, 5) };
  }
  const [datePart, timePart = ""] = trimmed.split("T");
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "",
    time: timePart.slice(0, 5),
  };
}

export function joinDateTimeValue(date: string, time: string, mode: DateTimePickerMode): string {
  if (mode === "time") return time;
  if (mode === "date") return date;
  if (!date) return "";
  return time ? `${date}T${time}` : date;
}

export function localDateTimeValueToIso(value: string): string | null {
  const { date, time } = splitDateTimeValue(value);
  if (!date) return null;
  const parsed = parseYmd(date);
  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    parsed.setHours(hours || 0, minutes || 0, 0, 0);
  }
  return parsed.toISOString();
}

export function isoToLocalDateTimeValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function isoToLocalDateValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatPickerValue(value: string, mode: DateTimePickerMode): string {
  const { date, time } = splitDateTimeValue(value);
  if (mode === "time") {
    return time || "";
  }
  if (!date) return "";
  const parsed = parseYmd(date);
  const dateLabel = parsed.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (mode === "date" || !time) return dateLabel;
  return `${dateLabel}, ${time}`;
}

export function formatPreferredDateTime(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const formatted = formatPickerValue(raw.trim(), raw.includes("T") || raw.includes(":") ? "datetime" : "date");
  return formatted || raw.trim();
}

export function buildTimeSlots(
  opens: string,
  closes: string,
  stepMinutes = 30,
  inclusiveEnd = false,
): string[] {
  const start = timeToMinutes(opens);
  const end = timeToMinutes(closes);
  if (end <= start) return [];
  const slots: string[] = [];
  const last = inclusiveEnd ? end : end - stepMinutes;
  for (let minutes = start; minutes <= last; minutes += stepMinutes) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
}

export function appointmentSlotsForDate(
  ymd: string,
  hours: OpeningHoursRow[],
  stepMinutes = 30,
  now = new Date(),
): string[] {
  const date = parseYmd(ymd);
  const row = hoursForJsWeekday(hours, date.getDay());
  if (!row) return [];
  const periods = periodsForOpeningHoursRow(row);
  if (periods.length === 0) return [];
  let slots = periods.flatMap((period) => buildTimeSlots(period.opens, period.closes, stepMinutes));
  if (ymd === todayYmd(now)) {
    const cutoff = now.getHours() * 60 + now.getMinutes() + 30;
    slots = slots.filter((slot) => timeToMinutes(slot) >= cutoff);
  }
  return slots;
}

export function isAppointmentDayDisabled(ymd: string, hours: OpeningHoursRow[], minYmd?: string, maxYmd?: string): boolean {
  if (minYmd && ymd < minYmd) return true;
  if (maxYmd && ymd > maxYmd) return true;
  return !isShopOpenOnJsWeekday(hours, parseYmd(ymd).getDay());
}

export function appointmentDateRange(daysAhead = 90): { min: string; max: string } {
  const min = todayYmd();
  return { min, max: addDaysYmd(min, daysAhead) };
}

export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const jsDay = first.getDay();
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < mondayOffset; i += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(`${year}-${pad2(month + 1)}-${pad2(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
