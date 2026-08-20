"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import {
  formatProductPrice,
  isProductInStock,
  type Product,
} from "@/lib/products";
import { useProductVariation } from "@/components/product/ProductVariationContext";
import { ui } from "@/lib/i18n/ui";
import { shortVariationLabel } from "@/lib/wc-variations";

type ProductPurchaseActionsProps = {
  product: Product;
  /** WooCommerce variation id uit URL (?variation=), voor deeplinks vanuit cos. */
  initialVariationId?: number;
};

type QuantityStepperProps = {
  productId: number;
  idSuffix: string;
  quantity: number;
  quantityDraft: string;
  onApply: (next: number) => void;
  onDraftChange: (raw: string) => void;
  onCommit: () => void;
  compact?: boolean;
};

function QuantityStepper({
  productId,
  idSuffix,
  quantity,
  quantityDraft,
  onApply,
  onDraftChange,
  onCommit,
  compact = false,
}: QuantityStepperProps) {
  const inputId = `qty-${productId}-${idSuffix}`;

  return (
    <div
      className={`flex shrink-0 items-stretch rounded-full border border-[#B38F27] bg-white ${
        compact ? "h-11" : "h-12"
      }`}
    >
      <button
        type="button"
        className={`flex items-center justify-center text-[var(--foreground)] touch-manipulation ${
          compact ? "min-w-11 px-3" : "min-w-12 px-4"
        }`}
        aria-label="Aantal verlagen"
        onClick={() => onApply(quantity - 1)}
      >
        -
      </button>
      <label className="sr-only" htmlFor={inputId}>
        Aantal
      </label>
      <input
        id={inputId}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        enterKeyHint="done"
        aria-label="Aantal"
        value={quantityDraft}
        onChange={(e) => onDraftChange(e.target.value.replace(/\D/g, ""))}
        onBlur={onCommit}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className={`min-w-0 border-0 bg-transparent text-center font-semibold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[#B38F27]/35 focus:ring-inset touch-manipulation ${
          compact ? "w-14 text-base" : "w-16 text-base sm:text-sm"
        }`}
      />
      <button
        type="button"
        className={`flex items-center justify-center text-[var(--foreground)] touch-manipulation ${
          compact ? "min-w-11 px-3" : "min-w-12 px-4"
        }`}
        aria-label="Aantal verhogen"
        onClick={() => onApply(quantity + 1)}
      >
        +
      </button>
    </div>
  );
}

export default function ProductPurchaseActions({
  product,
  initialVariationId: _initialVariationId,
}: ProductPurchaseActionsProps) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const variationCtx = useProductVariation();
  const variations = variationCtx?.variations;
  const selectedId = variationCtx?.selectedId ?? null;
  const setSelectedId = variationCtx?.setSelectedId;
  const [quantity, setQuantity] = useState(1);
  const [quantityDraft, setQuantityDraft] = useState("1");
  const { addItem } = useCart();

  function clampQuantity(value: number): number {
    if (!Number.isFinite(value) || value < 1) {
      return 1;
    }
    return Math.floor(value);
  }

  function applyQuantity(next: number) {
    const q = clampQuantity(next);
    setQuantity(q);
    setQuantityDraft(String(q));
  }

  function commitQuantityDraft() {
    const parsed = Number(quantityDraft.replace(/\D/g, ""));
    applyQuantity(Number.isFinite(parsed) && quantityDraft.trim() !== "" ? parsed : 1);
  }

  function handleDraftChange(raw: string) {
    setQuantityDraft(raw);
    if (raw !== "") {
      setQuantity(clampQuantity(Number(raw)));
    }
  }

  const selected = variations?.find((v) => v.id === selectedId);
  const needsChoice = Boolean(variations && variations.length > 1);
  const inStock = isProductInStock(product);
  const canAdd = inStock && (!needsChoice || selectedId != null);

  function resolvedQuantity(): number {
    const parsed = Number(quantityDraft.replace(/\D/g, ""));
    if (quantityDraft.trim() !== "" && Number.isFinite(parsed)) {
      return clampQuantity(parsed);
    }
    return quantity;
  }

  function handleAddToCart() {
    const q = resolvedQuantity();
    setQuantity(q);
    setQuantityDraft(String(q));
    const v =
      variations?.length === 1 ? variations[0] : selected ?? undefined;
    addItem(product, q, v ? { variation: v } : undefined);
  }

  const catalogUnit = useMemo(() => {
    if (!variations?.length) {
      return product.price;
    }
    if (variations.length === 1) {
      return variations[0].price;
    }
    return selected?.price;
  }, [variations, selected, product.price]);

  const stepperProps = {
    productId: product.id,
    quantity,
    quantityDraft,
    onApply: applyQuantity,
    onDraftChange: handleDraftChange,
    onCommit: commitQuantityDraft,
  };

  return (
    <div className="space-y-4">
      {!inStock ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Momenteel niet op voorraad — je kunt dit product niet toevoegen. Neem contact op voor beschikbaarheid.
        </p>
      ) : null}
      {variations && variations.length > 1 ? (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">Kies een variant</p>
            {selected ? (
              <p className="text-sm text-[var(--foreground)]/60">
                Gekozen:{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {shortVariationLabel(selected.label)}
                </span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-[#96741f]">Nog geen keuze gemaakt</p>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {variations.map((v) => {
              const active = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={active}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${
                    active
                      ? "border-[#B38F27] bg-[#B38F27] text-white"
                      : "border-[#e5dcc8] bg-white text-[var(--foreground)] hover:border-[#B38F27] hover:bg-[var(--brand-surface-alt)]"
                  }`}
                  onClick={() => {
                    setSelectedId?.(v.id);
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.set("variation", String(v.id));
                      window.history.replaceState(null, "", url.pathname + url.search);
                    }
                  }}
                >
                  {shortVariationLabel(v.label)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {catalogUnit == null && needsChoice ? (
        <p className="text-sm text-[var(--foreground)]/65">{t.chooseVariantFirst}</p>
      ) : null}

      {/* Aantal + hoofd-CTA: op elke breedte direct naast/onder elkaar in beeld */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <QuantityStepper {...stepperProps} idSuffix="page" />
        <button
          type="button"
          disabled={!canAdd}
          className="min-h-12 flex-1 rounded-full bg-[#B38F27] px-6 text-base font-bold text-white transition duration-300 enabled:hover:bg-[#96741f] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleAddToCart}
        >
          {t.inCart}
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-[var(--foreground)]/60">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-[#166534]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 018 0v3" strokeLinecap="round" />
        </svg>
        {t.safeCheckout}
      </p>

      {/* Mobiele sticky bar — vast onderaan viewport */}
      <div
        className="product-mobile-cart-bar fixed inset-x-0 bottom-0 z-50 border-t border-[#e5dcc8] bg-white/95 backdrop-blur-md lg:hidden"
        role="region"
        aria-label={t.inCart}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <p className="mb-2 truncate text-xs font-semibold text-[var(--foreground)]/70">
            {product.name}
          </p>
          <div className="flex items-center gap-2.5">
            <QuantityStepper {...stepperProps} idSuffix="sticky" compact />
            <div className="min-w-0 flex-1">
              {catalogUnit != null ? (
                <p className="text-sm font-bold leading-tight text-[var(--foreground)]">
                  {formatProductPrice(catalogUnit, product.currency)}
                </p>
              ) : needsChoice ? (
                <p className="text-xs text-[var(--foreground)]/65">{t.chooseVariant}</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!canAdd}
              className="min-h-11 shrink-0 rounded-full bg-[#B38F27] px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-[#96741f] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleAddToCart}
            >
              {t.addToCart}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
