"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  appointmentSlotsForDate,
  buildTimeSlots,
  formatPickerValue,
  isAppointmentDayDisabled,
  joinDateTimeValue,
  monthGrid,
  splitDateTimeValue,
  todayYmd,
  type DateTimePickerMode,
} from "@/lib/datetime-picker";
import type { OpeningHoursRow } from "@/lib/opening-hours";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { ui } from "@/lib/i18n/ui";

function resolveTimeSlots(
  mode: DateTimePickerMode,
  date: string,
  hours: OpeningHoursRow[] | undefined,
  minuteStep: number,
): string[] {
  if (mode === "time") return buildTimeSlots("06:00", "22:00", minuteStep, true);
  if (mode !== "datetime" || !date) return [];
  if (hours?.length) return appointmentSlotsForDate(date, hours, minuteStep);
  return buildTimeSlots("00:00", "23:45", minuteStep, true);
}

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  mode?: DateTimePickerMode;
  variant?: "site" | "admin";
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  hours?: OpeningHoursRow[];
  minuteStep?: number;
  className?: string;
};

export default function DateTimePicker({
  id,
  value,
  onChange,
  mode = "date",
  variant = "site",
  min,
  max,
  disabled = false,
  required = false,
  placeholder,
  hours,
  minuteStep = 30,
  className = "",
}: Props) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const weekdays = t.weekdaysShort;
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 296 });
  const { date, time } = splitDateTimeValue(value);
  const selected = date ? new Date(`${date}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const defaultPlaceholder =
    mode === "time" ? t.pickTime : mode === "datetime" ? t.pickDateTime : t.pickDate;
  const label = formatPickerValue(value, mode) || placeholder || defaultPlaceholder;
  const slots = resolveTimeSlots(mode, date, hours, minuteStep);

  useEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = mode === "time" ? 196 : 296;
      const estimatedHeight = mode === "time" ? 280 : mode === "datetime" ? 420 : 340;
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      let top = rect.bottom + 8;
      if (top + estimatedHeight > window.innerHeight - 12 && rect.top > estimatedHeight) {
        top = rect.top - estimatedHeight - 8;
      }
      setCoords({ top, left, width });
    }

    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onScroll() {
      setOpen(false);
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mode]);

  function openPicker() {
    if (disabled) return;
    const current = date ? new Date(`${date}T12:00:00`) : new Date();
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
    setOpen(true);
  }

  function pickDate(ymd: string) {
    if (hours?.length && isAppointmentDayDisabled(ymd, hours, min, max)) return;
    if (min && ymd < min) return;
    if (max && ymd > max) return;
    if (mode === "date") {
      onChange(ymd);
      setOpen(false);
      return;
    }
    const nextSlots = resolveTimeSlots("datetime", ymd, hours, minuteStep);
    const keepTime = time && nextSlots.includes(time) ? time : "";
    onChange(joinDateTimeValue(ymd, keepTime, "datetime"));
  }

  function pickTime(nextTime: string) {
    if (mode === "time") {
      onChange(nextTime);
      setOpen(false);
      return;
    }
    if (!date) return;
    onChange(joinDateTimeValue(date, nextTime, "datetime"));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  const cells = monthGrid(viewYear, viewMonth);
  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });
  const today = todayYmd();
  const admin = variant === "admin";
  const triggerClass = admin
    ? `admin-field admin-field--flush inline-flex w-full cursor-pointer items-center justify-between gap-2 text-left ${disabled ? "opacity-50" : ""} ${className}`.trim()
    : `mt-1 inline-flex min-h-[2.625rem] w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-left text-sm outline-none transition hover:border-[var(--brand)] focus:border-[var(--brand)] disabled:opacity-50 ${className}`.trim();

  const popover = open && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={popoverRef}
          id={`${fieldId}-popover`}
          role="dialog"
          aria-label={mode === "time" ? "Tijd kiezen" : "Datum kiezen"}
          className={
            admin
              ? "fixed z-[80] rounded-[12px] border border-[#e5dcc8] bg-white p-3 shadow-[0_12px_32px_-12px_rgb(26_21_36_/_0.45)]"
              : "fixed z-[80] rounded-2xl border border-[var(--brand-border)] bg-white p-3 shadow-[0_16px_40px_-18px_rgb(26_21_36_/_0.4)]"
          }
          style={{ top: coords.top, left: coords.left, width: coords.width }}
        >
          {mode !== "time" ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm hover:bg-[var(--brand-surface-alt)]"
                  onClick={() => shiftMonth(-1)}
                  aria-label={t.prevMonth}
                >
                  ‹
                </button>
                <p className="text-sm font-semibold capitalize">{monthTitle}</p>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm hover:bg-[var(--brand-surface-alt)]"
                  onClick={() => shiftMonth(1)}
                  aria-label={t.nextMonth}
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-bold uppercase tracking-wide text-[var(--foreground)]/45">
                {weekdays.map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                {cells.map((ymd, index) => {
                  if (!ymd) return <span key={`e-${index}`} />;
                  const closed = hours?.length
                    ? isAppointmentDayDisabled(ymd, hours, min, max)
                    : Boolean((min && ymd < min) || (max && ymd > max));
                  const isSelected = ymd === date;
                  const isToday = ymd === today;
                  return (
                    <button
                      key={ymd}
                      type="button"
                      disabled={closed}
                      onClick={() => pickDate(ymd)}
                      className={[
                        "h-9 rounded-lg text-sm transition",
                        closed ? "cursor-not-allowed text-[var(--foreground)]/25" : "hover:bg-[var(--brand-surface-alt)]",
                        isSelected ? "bg-[var(--brand-mid)] font-semibold text-[#1a1a1a] hover:bg-[var(--brand-mid)]" : "",
                        !isSelected && isToday ? "ring-1 ring-[var(--brand)]/40" : "",
                      ].join(" ")}
                    >
                      {Number(ymd.slice(-2))}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {mode !== "date" ? (
            <div className={mode === "time" ? "" : "mt-3 border-t border-[var(--brand-border)] pt-3"}>
              {mode === "datetime" && !date ? (
                <p className="text-xs text-[var(--foreground)]/55">Kies eerst een datum.</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-[var(--foreground)]/55">{t.noTimesAvailable}</p>
              ) : (
                <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto">
                  {slots.map((slot) => {
                    const selectedSlot = slot === time;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => pickTime(slot)}
                        className={[
                          "rounded-lg px-2 py-1.5 text-xs font-semibold tabular-nums transition",
                          selectedSlot
                            ? "bg-[var(--brand-mid)] text-[#1a1a1a]"
                            : "bg-[var(--brand-surface)] hover:bg-[var(--brand-surface-alt)]",
                        ].join(" ")}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {value ? (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--foreground)]/55 hover:text-[var(--brand)]"
              onClick={() => {
                onChange("");
                if (mode === "date" || mode === "time") setOpen(false);
              }}
            >
              Wissen
            </button>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${fieldId}-popover` : undefined}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={triggerClass}
      >
        <span className={`min-w-0 truncate ${value ? "" : "text-[var(--foreground)]/45"}`}>{label}</span>
        <span className="shrink-0 text-[var(--foreground)]/40" aria-hidden>
          {mode === "time" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3.5" y="5" width="17" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3.5 10h17" />
            </svg>
          )}
        </span>
      </button>
      {required ? (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => undefined}
          className="sr-only"
          aria-hidden
        />
      ) : null}
      {popover}
    </>
  );
}
