"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { SHOP_PHONE_LABEL, shopPhoneTelHref } from "@/lib/site-contact";
import { SHOP_OPENING_HOURS_SHORT } from "@/lib/site-content";
import { formatProductPrice, type Product, type WcVariationJson } from "@/lib/products";

type ProductLandingPromoProps = {
  product: Product;
};

const pad = (n: number) => String(n).padStart(2, "0");

function formatPromoPrice(value: number, currency: string) {
  return formatProductPrice(value, currency);
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 8V6a3 3 0 016 0v2M5 9h14l-1 11H6L5 9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function pickDefaultVariation(product: Product): WcVariationJson | undefined {
  const v = product.wcVariations;
  if (!v?.length) {
    return undefined;
  }
  if (v.length === 1) {
    return v[0];
  }
  return v.reduce((a, b) => (a.price <= b.price ? a : b));
}

export default function ProductLandingPromo({ product }: ProductLandingPromoProps) {
  const promo = product.landingPromo;
  const [hms, setHms] = useState({ h: 0, m: 0, s: 0 });
  const { addItem } = useCart();

  useEffect(() => {
    const tick = () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - Date.now());
      setHms({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!promo) {
    return null;
  }

  const phone = promo.phone ?? SHOP_PHONE_LABEL;
  const phoneHref = shopPhoneTelHref(phone);
  const phoneHours = promo.phoneHours ?? SHOP_OPENING_HOURS_SHORT;

  const handleOrder = () => {
    const variation = pickDefaultVariation(product);
    addItem(product, 1, variation ? { variation } : undefined);
  };

  return (
    <div className="mt-8 w-full font-sans">
      <div className="w-full space-y-3 text-center">
        <div className="w-full rounded-md bg-[#fce7ec] px-3 py-2 text-sm font-medium text-[var(--foreground)]">
          OUDE PRIJS: {formatPromoPrice(promo.oldPrice, product.currency)}
        </div>
        <div className="w-full rounded-md bg-[#dff0d8] px-3 py-3 text-base font-bold text-[#1b5e20] md:text-lg">
          ACTIEPRIJS: {formatPromoPrice(promo.price, product.currency)}
        </div>
        {promo.oldPrice > promo.price ? (
          <p className="text-center text-sm font-semibold text-red-600">
            Je bespaart: {formatProductPrice(promo.oldPrice - promo.price, product.currency)}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex w-full justify-center gap-6 md:gap-10">
        {(
          [
            { value: pad(hms.h), label: "UUR" },
            { value: pad(hms.m), label: "MIN" },
            { value: pad(hms.s), label: "SEC" },
          ] as const
        ).map((cell) => (
          <div key={cell.label} className="flex min-w-[4.5rem] flex-col items-center">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-[var(--foreground)] md:text-5xl">
              {cell.value}
            </span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/70">
              {cell.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-1 text-center text-sm font-semibold text-red-600">
        <p>• Op voorraad — laatste stuks!</p>
        <p>Wees er snel bij!</p>
      </div>

      <button
        type="button"
        onClick={handleOrder}
        className="mt-5 flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-[#ff8c00] px-4 py-4 text-white shadow-md transition hover:bg-[#e67e00] active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 text-lg font-bold">
          <BagIcon className="h-6 w-6 shrink-0" />
          Nu bestellen
        </span>
        <span className="text-sm font-medium text-white/95">Rembours bij aflevering</span>
      </button>

      <p className="mt-4 text-center text-sm font-semibold text-[var(--foreground)]">OF</p>

      <a
        href={phoneHref}
        className="mt-3 flex w-full flex-col items-center rounded-2xl bg-[#b8b8f0] px-4 py-4 text-center text-white shadow-sm transition hover:bg-[#a6a6e8]"
      >
        <span className="text-sm font-bold leading-snug">TELEFOONBESTELLING {phone}</span>
        <span className="mt-1 text-xs font-medium text-white/95">{phoneHours}</span>
      </a>
    </div>
  );
}
