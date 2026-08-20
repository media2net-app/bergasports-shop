"use client";

import { useMollieMethods } from "@/components/payments/useMollieMethods";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import {
  formatMollieMethodNames,
  mollieMethodImageUrl,
  mollieMethodLabel,
} from "@/lib/mollie-methods";
import { ui } from "@/lib/i18n/ui";

type Props = {
  amount: number;
  currency: string;
  country?: string;
  className?: string;
};

export default function MollieMethodsHint({ amount, currency, country = "NL", className = "" }: Props) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const { methods, loading } = useMollieMethods({ amount, currency, country });
  const names = formatMollieMethodNames(methods);
  const payCopy = names ? t.paySafeWith(names) : t.paySafeMollie;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {methods.length > 0 ? (
        <ul className="flex flex-wrap items-center justify-center gap-1.5" aria-hidden>
          {methods.map((method) => {
            const src = mollieMethodImageUrl(method);
            const label = method.description?.trim() || mollieMethodLabel(method.id);
            return (
              <li key={method.id} title={label}>
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={label}
                    width={28}
                    height={20}
                    className="h-5 w-7 object-contain"
                  />
                ) : (
                  <span className="rounded border border-[var(--brand-border)] px-1.5 py-0.5 text-[10px] font-semibold">
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="text-center text-[11px] leading-relaxed text-[var(--foreground)]/50">
        {loading && methods.length === 0 ? t.paySafeMollie : payCopy}
        {" · "}
        {t.freePickupDedemsvaart}
      </p>
    </div>
  );
}
