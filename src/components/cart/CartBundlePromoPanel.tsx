"use client";

import { useMemo, useState } from "react";
import type { CartBundleTier, Product } from "@/lib/products";
import { formatProductPrice, getBundleTierById } from "@/lib/products";
import OptimizedProductImage from "@/components/ui/OptimizedProductImage";

export type CartBundleLineItem = {
  lineId: string;
  productId: number;
  name: string;
  price: number;
  bundleListUnit?: number;
  currency: string;
  image: string;
  quantity: number;
  selectedBundleTierId?: string;
};

const NL_PROVINCES = [
  "Drenthe",
  "Flevoland",
  "Friesland",
  "Gelderland",
  "Groningen",
  "Limburg",
  "Noord-Brabant",
  "Noord-Holland",
  "Overijssel",
  "Utrecht",
  "Zeeland",
  "Zuid-Holland",
] as const;

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth="1.5" strokeLinecap="round" d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
      <path strokeWidth="1.5" strokeLinecap="round" d="M5 21v-1a7 7 0 0114 0v1" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 4h3l2 5-2 1a12 12 0 006 6l1-2 5 2v3a1 1 0 01-1 1h-1C10.4 20 4 13.6 4 5.5V4.5a1 1 0 011-1z"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
      />
      <circle cx="12" cy="10" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function badgeClass(tone: CartBundleTier["badge"]["tone"]) {
  if (tone === "pink") {
    return "bg-rose-100 text-rose-900";
  }
  if (tone === "purple") {
    return "bg-[#7c3aed] text-white";
  }
  return "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 text-white";
}

type CartBundlePromoPanelProps = {
  item: CartBundleLineItem;
  product: Product;
  onTierChange: (tierId: string) => void;
  onRemove: () => void;
};

export default function CartBundlePromoPanel({
  item,
  product,
  onTierChange,
  onRemove,
}: CartBundlePromoPanelProps) {
  const tiers = product.cartBundlePromos?.tiers ?? [];
  const activeId = item.selectedBundleTierId ?? tiers[0]?.id;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [judet, setJudet] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");

  const summary = useMemo(() => {
    const tier = activeId ? getBundleTierById(product, activeId) : null;
    const listUnit = item.bundleListUnit ?? tier?.listSubtotal ?? 0;
    const priceUnit = item.price;
    const qty = item.quantity;
    const subtotal = listUnit * qty;
    const total = priceUnit * qty;
    const discount = subtotal - total;
    return { subtotal, discount, total };
  }, [activeId, item.bundleListUnit, item.price, item.quantity, product]);

  const inputShell = "flex overflow-hidden rounded-xl border border-[#e5dcc8] bg-white";
  const iconCell = "flex w-11 shrink-0 items-center justify-center bg-[#f3f0f7] text-[var(--foreground)]/60";
  const fieldClass =
    "min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)]/40";

  return (
    <div className="space-y-4 pb-2">
      <p className="text-sm font-semibold text-[var(--foreground)]">Kies je aanbieding</p>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const selected = tier.id === activeId;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onTierChange(tier.id)}
              className={`flex w-full gap-3 rounded-2xl border-2 bg-white p-3 text-left transition ${
                selected
                  ? "border-[#8B5CF6] shadow-[0_0_0_1px_rgba(139,92,246,0.25)]"
                  : "border-[#e5dcc8] hover:border-[#d8cce8]"
              }`}
            >
              <OptimizedProductImage
                src={item.image}
                alt=""
                variant="cartThumb"
                className="object-cover"
                wrapperClassName="h-16 w-16 shrink-0 rounded-lg border border-[#e5dcc8]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{tier.title}</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  {tier.listSubtotal > tier.price ? (
                    <span className="text-sm text-[var(--foreground)]/45 line-through">
                      {formatProductPrice(tier.listSubtotal, item.currency)}
                    </span>
                  ) : null}
                  <span className="text-base font-bold text-[var(--foreground)]">
                    {formatProductPrice(tier.price, item.currency)}
                  </span>
                </div>
                <span
                  className={`mt-2 inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${badgeClass(tier.badge.tone)}`}
                >
                  {tier.badge.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#e5dcc8] bg-[#faf9fc] p-4">
        <div className="space-y-2 text-sm text-[var(--foreground)]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-medium">{formatProductPrice(summary.subtotal, item.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Korting</span>
            <span className={`font-semibold ${summary.discount > 0 ? "text-red-600" : "text-[var(--foreground)]/60"}`}>
              {summary.discount > 0 ? `-${formatProductPrice(summary.discount, item.currency)}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Snelle levering in Nederland en België</span>
            <span className="font-semibold text-emerald-700">Gratuit</span>
          </div>
          <div className="flex justify-between border-t border-[#e5dcc8] pt-3 text-base">
            <span className="font-bold">Total</span>
            <span className="font-bold text-[var(--foreground)]">{formatProductPrice(summary.total, item.currency)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Bezorggegevens</p>

        <div className={inputShell}>
          <span className={iconCell}>
            <UserIcon className="h-5 w-5" />
          </span>
          <input
            className={fieldClass}
            placeholder="Volledige naam"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div className={inputShell}>
          <span className={iconCell}>
            <PhoneIcon className="h-5 w-5" />
          </span>
          <input
            className={fieldClass}
            placeholder="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </div>

        <div className={inputShell}>
          <span className={iconCell}>
            <PinIcon className="h-5 w-5" />
          </span>
          <select
            className={`${fieldClass} cursor-pointer`}
            value={judet}
            onChange={(e) => setJudet(e.target.value)}
          >
            <option value="">Provincie</option>
            {NL_PROVINCES.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        <div className={inputShell}>
          <span className={iconCell}>
            <PinIcon className="h-5 w-5" />
          </span>
          <input
            className={fieldClass}
            placeholder="Plaats"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className={inputShell}>
          <span className={iconCell}>
            <PinIcon className="h-5 w-5" />
          </span>
          <input
            className={fieldClass}
            placeholder="Straat en huisnummer"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            autoComplete="street-address"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-xs font-semibold text-[var(--foreground)]/60 underline hover:text-[var(--foreground)]"
      >
        Verwijderen uit winkelwagen
      </button>
    </div>
  );
}
