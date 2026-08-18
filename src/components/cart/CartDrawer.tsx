"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { useEffect, useId, useState } from "react";

import CartBundlePromoPanel from "@/components/cart/CartBundlePromoPanel";
import CartCheckoutForm from "@/components/cart/CartCheckoutForm";
import type { CartItem } from "@/components/cart/CartProvider";
import { useProductLookup } from "@/components/cart/ProductLookupProvider";
import MollieMethodsHint from "@/components/payments/MollieMethodsHint";
import OptimizedProductImage from "@/components/ui/OptimizedProductImage";
import { productPath } from "@/lib/product-slug";
import { formatProductPrice, type Product } from "@/lib/products";
import { formatFreeShippingThreshold, meetsFreeShippingThreshold } from "@/lib/shop-delivery-trust";
import { shortVariationLabel, sortVariationsForDisplay } from "@/lib/wc-variations";

const btnGold =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--brand-mid)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] transition hover:bg-[#f2d680]";
const btnGhost =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--brand-border)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  orderSuccess: string | null;
  onDismissSuccess: () => void;
  showBundlePromos: boolean;
  singleItem: CartItem | null;
  bundleProduct: Product | null;
  onTierChange: (tierId: string) => void;
  onRemove: (lineId: string) => void;
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  cartSummaryByCurrency: Record<string, { list: number; paid: number }>;
  checkoutTotal: number;
  primaryCurrency: string;
  checkoutDiscount: number;
  primarySummary: { list: number; paid: number };
  freeShippingThreshold?: number;
  onCheckoutSuccess: (orderNumber: string) => void;
};

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QtyStepper({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="inline-flex h-9 items-stretch overflow-hidden rounded-full border border-[var(--brand-border)] bg-white">
      <button
        type="button"
        className="flex w-9 items-center justify-center text-[var(--foreground)] transition hover:bg-[var(--brand-surface)]"
        aria-label="Aantal verlagen"
        onClick={onDecrease}
      >
        −
      </button>
      <span className="flex min-w-8 items-center justify-center text-sm font-semibold tabular-nums text-[var(--foreground)]">
        {quantity}
      </span>
      <button
        type="button"
        className="flex w-9 items-center justify-center text-[var(--foreground)] transition hover:bg-[var(--brand-surface)]"
        aria-label="Aantal verhogen"
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  );
}

function FreeShippingHint({
  subtotal,
  currency,
  threshold,
}: {
  subtotal: number;
  currency: string;
  threshold?: number;
}) {
  if (threshold == null || threshold <= 0) {
    return null;
  }

  const remaining = Math.max(0, threshold - subtotal);
  const qualifies = meetsFreeShippingThreshold(subtotal, threshold);
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div className="space-y-2">
      <div className="h-1 overflow-hidden rounded-full bg-[var(--brand-border-soft)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-mid)] transition-[width] duration-300"
          style={{ width: `${qualifies ? 100 : progress}%` }}
        />
      </div>
      <p className="text-xs leading-relaxed text-[var(--foreground)]/65">
        {qualifies ? (
          <span className="font-semibold text-[#166534]">
            Gratis verzending naar Nederland. Afhalen in Dedemsvaart is altijd gratis.
          </span>
        ) : (
          <>
            Nog{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {formatProductPrice(remaining, currency)}
            </span>{" "}
            tot gratis verzending naar Nederland (vanaf {formatFreeShippingThreshold(currency, threshold)}).
          </>
        )}
      </p>
    </div>
  );
}

function TrustLine({ amount, currency }: { amount: number; currency: string }) {
  const hintAmount = amount > 0 ? amount : 50;
  return <MollieMethodsHint amount={hintAmount} currency={currency} />;
}

function CartLineRow({
  item,
  onRemove,
  onUpdateQuantity,
  onClose,
}: {
  item: CartItem;
  onRemove: (lineId: string) => void;
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  onClose: () => void;
}) {
  const { getProductById } = useProductLookup();
  const lineTotal = item.price * item.quantity;
  const hasBundleSave = item.bundleListUnit != null && item.bundleListUnit > item.price + 0.005;

  const rowProduct = item.lineId.startsWith("b:") ? null : getProductById(item.productId);
  const wcSorted = sortVariationsForDisplay(rowProduct?.wcVariations);
  const showVariationChips = Boolean(wcSorted && wcSorted.length > 1);

  return (
    <article className="rounded-3xl border border-[var(--brand-border)] bg-white p-3.5 shadow-[0_8px_30px_-18px_rgb(26_21_36_/_0.28)]">
      <div className="flex items-start gap-3">
        <OptimizedProductImage
          src={item.image}
          alt={item.name}
          variant="cartThumb"
          className="object-cover"
          wrapperClassName="h-20 w-20 shrink-0 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface-alt)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 font-[family-name:var(--font-heading)] text-sm font-semibold leading-snug text-[var(--foreground)]">
              {item.name}
            </p>
            <button
              type="button"
              className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--foreground)]/40 transition hover:bg-[var(--brand-surface)] hover:text-[var(--foreground)]"
              aria-label={`${item.name} verwijderen`}
              onClick={() => onRemove(item.lineId)}
            >
              <CloseIcon />
            </button>
          </div>

          {showVariationChips && wcSorted ? (
            <div className="mt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">Variant</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {wcSorted.map((v) => {
                  const active = item.variationId === v.id;
                  const label = shortVariationLabel(v.label);
                  if (active) {
                    return (
                      <span
                        key={v.id}
                        className="rounded-full bg-[var(--brand-mid)] px-2.5 py-1 text-[11px] font-bold text-[#1a1a1a]"
                      >
                        {label}
                      </span>
                    );
                  }
                  return (
                    <LocalizedLink
                      key={v.id}
                      href={`${rowProduct ? productPath(rowProduct) : `/product/${item.productId}`}?variation=${v.id}`}
                      onClick={onClose}
                      scroll
                      className="rounded-full border border-[var(--brand-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                    >
                      {label}
                    </LocalizedLink>
                  );
                })}
              </div>
            </div>
          ) : item.variationLabel ? (
            <p className="mt-1 text-xs text-[var(--foreground)]/60">{item.variationLabel}</p>
          ) : null}

          {hasBundleSave ? (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-2 text-sm">
              <span className="text-[var(--foreground)]/40 line-through">
                {formatProductPrice(item.bundleListUnit!, item.currency)}
              </span>
              <span className="font-semibold">{formatProductPrice(item.price, item.currency)}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--foreground)]/55">
              {formatProductPrice(item.price, item.currency)} p.st.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <QtyStepper
          quantity={item.quantity}
          onDecrease={() => onUpdateQuantity(item.lineId, item.quantity - 1)}
          onIncrease={() => onUpdateQuantity(item.lineId, item.quantity + 1)}
        />
        <div className="text-right">
          {hasBundleSave ? (
            <p className="text-[11px] font-semibold text-red-600">
              Besparing{" "}
              {formatProductPrice((item.bundleListUnit! - item.price) * item.quantity, item.currency)}
            </p>
          ) : null}
          <p className="text-sm font-bold tabular-nums text-[var(--foreground)]">
            {formatProductPrice(lineTotal, item.currency)}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  orderSuccess,
  onDismissSuccess,
  showBundlePromos,
  singleItem,
  bundleProduct,
  onTierChange,
  onRemove,
  onUpdateQuantity,
  cartSummaryByCurrency,
  checkoutTotal,
  primaryCurrency,
  checkoutDiscount,
  primarySummary,
  freeShippingThreshold,
  onCheckoutSuccess,
}: CartDrawerProps) {
  const titleId = useId();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  if ((!isOpen || items.length === 0) && checkoutOpen) {
    setCheckoutOpen(false);
  }
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const showCheckout = checkoutOpen && items.length > 0 && !orderSuccess && !showBundlePromos;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const heading = orderSuccess ? "Bestelling geplaatst" : showCheckout ? "Afrekenen" : "Winkelwagen";

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? "pointer-events-auto bg-black/45 opacity-100" : "pointer-events-none bg-black/0 opacity-0"
      }`}
      onClick={onClose}
      aria-hidden={!isOpen}
      inert={!isOpen || undefined}
    >
      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-labelledby={titleId}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--background)] shadow-[-16px_0_48px_-24px_rgb(26_21_36_/_0.45)] transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[var(--brand-mid)] to-transparent"
          aria-hidden
        />

        <header
          className="relative shrink-0 bg-[var(--topbar)] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))] text-[var(--topbar-foreground)] md:px-5"
        >
          <span
            className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-mid)]/55 to-transparent"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {showCheckout ? (
                <button
                  type="button"
                  className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-mid)] transition hover:text-[#f2d680]"
                  onClick={() => setCheckoutOpen(false)}
                >
                  <BackIcon />
                  Terug
                </button>
              ) : (
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand-mid)]">
                  Bergasports
                </p>
              )}
              <h2
                id={titleId}
                className="mt-1 font-[family-name:var(--font-heading)] text-xl tracking-tight md:text-2xl"
              >
                {heading}
              </h2>
              {!orderSuccess && itemCount > 0 ? (
                <p className="mt-1 text-xs text-[var(--topbar-muted)]">
                  {itemCount === 1 ? "1 artikel" : `${itemCount} artikelen`}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-[var(--topbar-foreground)] transition hover:border-[var(--brand-mid)] hover:text-[var(--brand-mid)]"
              aria-label="Winkelwagen sluiten"
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-5">
          {orderSuccess ? (
            <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-5 shadow-[0_8px_30px_-18px_rgb(26_21_36_/_0.35)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Bevestiging</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/75">
                Bestelnummer <strong className="text-[var(--foreground)]">{orderSuccess}</strong>. We nemen contact op
                voor bevestiging en levering.
              </p>
              <button type="button" className={`${btnGold} mt-5`} onClick={onDismissSuccess}>
                Sluiten
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[60%] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--brand-border)] bg-white px-6 py-12 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Winkelwagen</p>
              <h3 className="section-rule section-rule-center mt-2 font-[family-name:var(--font-heading)] text-lg tracking-tight">
                Nog niets in je mandje
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--foreground)]/65">
                Ontdek fietsen, kleding en accessoires — of kom langs in Dedemsvaart.
              </p>
              <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
                <LocalizedLink href="/shop" className={btnGold} onClick={onClose}>
                  Naar de shop
                </LocalizedLink>
                <LocalizedLink href="/fietsen" className={btnGhost} onClick={onClose}>
                  Bekijk fietsen
                </LocalizedLink>
              </div>
            </div>
          ) : showBundlePromos && singleItem && bundleProduct ? (
            <CartBundlePromoPanel
              item={singleItem}
              product={bundleProduct}
              onTierChange={(tierId) => onTierChange(tierId)}
              onRemove={() => onRemove(singleItem.lineId)}
            />
          ) : showCheckout ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-4">
                {Object.entries(cartSummaryByCurrency).map(([currency, row]) => (
                  <div key={currency} className="flex items-baseline justify-between text-sm">
                    <span className="text-[var(--foreground)]/65">Te betalen</span>
                    <span className="font-[family-name:var(--font-heading)] text-base font-bold">
                      {formatProductPrice(row.paid, currency)}
                    </span>
                  </div>
                ))}
              </div>
              <CartCheckoutForm
                items={items}
                currency={primaryCurrency}
                subtotal={primarySummary.list}
                discountTotal={checkoutDiscount}
                total={checkoutTotal}
                onSuccess={onCheckoutSuccess}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <CartLineRow
                  key={item.lineId}
                  item={item}
                  onRemove={onRemove}
                  onUpdateQuantity={onUpdateQuantity}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>

        {!orderSuccess && items.length > 0 && !showCheckout ? (
          <footer className="shrink-0 border-t border-[var(--brand-border)] bg-white px-4 py-4 md:px-5">
            {showBundlePromos ? null : (
              <>
                <div className="space-y-2 text-sm">
                  {Object.entries(cartSummaryByCurrency).map(([currency, row]) => {
                    const discount = row.list - row.paid;
                    return (
                      <div key={currency} className="space-y-1.5">
                        <div className="flex justify-between text-[var(--foreground)]/70">
                          <span>Subtotaal</span>
                          <span className="font-medium tabular-nums text-[var(--foreground)]">
                            {formatProductPrice(row.list, currency)}
                          </span>
                        </div>
                        {discount > 0.005 ? (
                          <div className="flex justify-between text-red-600">
                            <span className="font-semibold">Korting</span>
                            <span className="font-semibold tabular-nums">-{formatProductPrice(discount, currency)}</span>
                          </div>
                        ) : null}
                        <div className="flex items-baseline justify-between border-t border-[var(--brand-border)] pt-2">
                          <span className="text-xs font-bold uppercase tracking-[0.14em]">Totaal</span>
                          <span className="font-[family-name:var(--font-heading)] text-lg font-bold tabular-nums">
                            {formatProductPrice(row.paid, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <FreeShippingHint
                    subtotal={checkoutTotal}
                    currency={primaryCurrency}
                    threshold={freeShippingThreshold}
                  />
                </div>
              </>
            )}
            <div className={`flex flex-col gap-2.5 ${showBundlePromos ? "" : "mt-4"}`}>
              {showBundlePromos ? null : (
                <button type="button" className={btnGold} onClick={() => setCheckoutOpen(true)}>
                  Afrekenen
                </button>
              )}
              <button type="button" className={btnGhost} onClick={onClose}>
                Verder winkelen
              </button>
            </div>
            <div className="mt-3">
              <TrustLine amount={checkoutTotal} currency={primaryCurrency} />
            </div>
          </footer>
        ) : !orderSuccess && items.length === 0 ? (
          <footer className="shrink-0 px-4 pb-4 md:px-5">
            <TrustLine amount={50} currency={primaryCurrency} />
          </footer>
        ) : showCheckout ? (
          <footer className="shrink-0 border-t border-[var(--brand-border)] bg-white px-4 py-3 md:px-5">
            <TrustLine amount={checkoutTotal} currency={primaryCurrency} />
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
