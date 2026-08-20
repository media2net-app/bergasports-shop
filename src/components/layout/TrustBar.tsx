"use client";

import { useEffect, useMemo, useState } from "react";

import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { localizedTrustBarUsps } from "@/lib/i18n/ui";

const ROTATE_MS = 4500;

/** Boven de header — roterende USPs. */
export default function TrustBar() {
  const { locale } = useShopLocale();
  const usps = useMemo(() => localizedTrustBarUsps(locale), [locale]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [locale]);

  useEffect(() => {
    if (usps.length <= 1) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % usps.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [usps]);

  const message = usps[index] ?? usps[0];

  return (
    <div className="bg-gradient-to-r from-[var(--brand-dark)] via-[var(--brand)] to-[var(--brand-dark)] text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-1.5">
        <p
          className="flex items-center justify-center gap-2 text-center text-[11px] font-semibold tracking-wide"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="hidden h-1 w-1 rounded-full bg-white/60 sm:block" aria-hidden />
          <span key={message} className="trust-usp-fade inline-block">
            {message}
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-white/60 sm:block" aria-hidden />
        </p>
      </div>
    </div>
  );
}
