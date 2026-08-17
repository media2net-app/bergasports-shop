"use client";

import { useEffect, useState } from "react";

import { TRUST_BAR_USPS } from "@/lib/site-content";

const ROTATE_MS = 4500;

/** Boven de header — roterende USPs. */
export default function TrustBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (TRUST_BAR_USPS.length <= 1) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % TRUST_BAR_USPS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const message = TRUST_BAR_USPS[index] ?? TRUST_BAR_USPS[0];

  return (
    <div className="bg-gradient-to-r from-[var(--brand-dark)] via-[var(--brand)] to-[var(--brand-dark)] text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-2.5">
        <p
          className="flex items-center justify-center gap-2 text-center text-[11px] font-semibold tracking-wide sm:text-xs"
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
