"use client";

import { useEffect, useState, type ClipboardEvent, type KeyboardEvent } from "react";

import { formatMoneyInput, sanitizeMoneyInput } from "@/lib/money-input";

type AdminMoneyInputProps = {
  id?: string;
  name?: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

export default function AdminMoneyInput({
  value,
  onChange,
  allowEmpty = false,
  min = 0,
  max,
  className,
  ...rest
}: AdminMoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const formatOpts = { allowEmpty, min, max };

  useEffect(() => {
    if (!focused) {
      setDraft(value);
    }
  }, [value, focused]);

  function updateDraft(raw: string) {
    const next = sanitizeMoneyInput(raw);
    setDraft(next);
    onChange(next);
  }

  function commit(raw: string) {
    const formatted = formatMoneyInput(raw, formatOpts);
    setDraft(formatted);
    onChange(formatted);
  }

  return (
    <input
      {...rest}
      className={className}
      type={focused ? "number" : "text"}
      inputMode="decimal"
      min={min}
      max={max}
      step="0.01"
      autoComplete="off"
      spellCheck={false}
      value={focused ? draft : formatMoneyInput(value, formatOpts)}
      onFocus={() => {
        setFocused(true);
        setDraft(value);
      }}
      onChange={(e) => updateDraft(e.target.value)}
      onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        updateDraft(e.clipboardData.getData("text"));
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
          e.preventDefault();
          return;
        }
        if (e.key === ",") {
          e.preventDefault();
          if (!draft.includes(".")) {
            updateDraft(`${draft}.`);
          }
        }
      }}
      onBlur={() => {
        setFocused(false);
        commit(draft);
      }}
    />
  );
}
