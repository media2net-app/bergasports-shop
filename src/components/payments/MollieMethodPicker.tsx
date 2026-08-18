"use client";

import {
  formatMollieMethodNames,
  mollieMethodImageUrl,
  mollieMethodLabel,
  type MollieMethodPublic,
} from "@/lib/mollie-methods";

type Props = {
  methods: MollieMethodPublic[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export default function MollieMethodPicker({ methods, value, onChange, disabled }: Props) {
  if (!methods?.length) return null;

  return (
    <fieldset className="relative z-10 space-y-2" disabled={disabled}>
      <legend className="text-xs font-medium text-[var(--foreground)]">Betaalmethode</legend>
      <p className="text-[11px] leading-relaxed text-[var(--foreground)]/55">
        {formatMollieMethodNames(methods)} — kies hoe je wilt betalen.
      </p>
      {methods.map((method) => {
        const selected = value === method.id;
        const src = mollieMethodImageUrl(method);
        const label = method.description?.trim() || mollieMethodLabel(method.id);
        return (
          <label
            key={method.id}
            className={`relative z-10 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white px-3 py-2.5 text-xs transition ${
              selected
                ? "border-[var(--brand)] ring-1 ring-[var(--brand)]/30"
                : "border-[var(--brand-border)] hover:border-[var(--brand)]"
            } ${disabled ? "pointer-events-none opacity-60" : ""}`}
          >
            <span className="inline-flex min-w-0 items-center gap-3">
              <input
                type="radio"
                name="mollie-method"
                className="relative z-10 shrink-0 accent-[var(--brand)]"
                checked={selected}
                onChange={() => onChange(method.id)}
              />
              {src ? (
                // Mollie CDN icons — not in next/image remotePatterns.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" width={32} height={24} className="h-6 w-8 object-contain" />
              ) : null}
              <span className="font-medium text-[var(--foreground)]">{label}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
