"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import type { Product, WcVariationJson } from "@/lib/products";
import {
  decodeImportedProductTitle,
  formatProductPrice,
  getBundleTierById,
  isProductInStock,
  resolveBundleTierForAdd,
} from "@/lib/products";
import { productPath } from "@/lib/product-slug";
import { useProductLookup } from "@/components/cart/ProductLookupProvider";
import { shortVariationLabel, sortVariationsForDisplay } from "@/lib/wc-variations";
import CartBundlePromoPanel from "@/components/cart/CartBundlePromoPanel";
import CartCheckoutForm from "@/components/cart/CartCheckoutForm";
import ShopDeliveryTrustPanel from "@/components/shop/ShopDeliveryTrustPanel";
import OptimizedProductImage from "@/components/ui/OptimizedProductImage";
import {
  trackTikTokAddToCart,
  trackTikTokPurchase,
  trackTikTokInitiateCheckout,
} from "@/lib/tiktok-pixel";

export type CartItem = {
  lineId: string;
  productId: number;
  name: string;
  price: number;
  bundleListUnit?: number;
  currency: string;
  image: string;
  quantity: number;
  selectedBundleTierId?: string;
  variationId?: number;
  variationLabel?: string;
};

export type AddToCartOptions = {
  bundleTierId?: string;
  variation?: WcVariationJson;
};

function cartLineId(
  productId: number,
  opts: { bundle?: boolean; variationId?: number },
): string {
  if (opts.bundle) {
    return `b:${productId}`;
  }
  if (opts.variationId != null) {
    return `v:${productId}:${opts.variationId}`;
  }
  return `p:${productId}`;
}

export type CartAnalyticsFunnel = {
  cartItemsCount: number;
  cartOpen: boolean;
  checkoutActive: boolean;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  analyticsFunnel: CartAnalyticsFunnel;
  addItem: (product: Product, quantity: number, options?: AddToCartOptions) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  openCart: () => void;
  closeCart: () => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineUnitPrice(item: CartItem) {
  return item.price;
}

function lineListUnit(item: CartItem): number {
  if (item.bundleListUnit != null) {
    return item.bundleListUnit;
  }
  return item.price;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getProductById, prefetch } = useProductLookup();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (items.length) {
      prefetch(items.map((i) => i.productId));
    }
  }, [items, prefetch]);

  const addItem = (product: Product, quantity: number, options?: AddToCartOptions) => {
    if (!isProductInStock(product)) {
      setIsOpen(true);
      return;
    }

    let trackUnitPrice = product.price;
    let trackQty = quantity;

    setItems((prev) => {
      const bundleLineId = cartLineId(product.id, { bundle: true });
      const existingBundle = prev.find((i) => i.lineId === bundleLineId);
      const tierChoice = options?.bundleTierId ?? existingBundle?.selectedBundleTierId;
      const bundleTier = resolveBundleTierForAdd(product, tierChoice);

      if (bundleTier) {
        const nextQty = existingBundle ? existingBundle.quantity + quantity : quantity;
        trackUnitPrice = bundleTier.price;
        trackQty = nextQty;
        const line: CartItem = {
          lineId: bundleLineId,
          productId: product.id,
          name: decodeImportedProductTitle(product.name),
          price: bundleTier.price,
          bundleListUnit: bundleTier.listSubtotal,
          currency: product.currency,
          image: product.image,
          quantity: nextQty,
          selectedBundleTierId: bundleTier.id,
        };
        if (existingBundle) {
          return prev.map((i) => (i.lineId === bundleLineId ? line : i));
        }
        return [...prev, line];
      }

      const variation = options?.variation;
      if (product.wcVariations?.length && !variation) {
        return prev;
      }

      const plainLineId = variation
        ? cartLineId(product.id, { variationId: variation.id })
        : cartLineId(product.id, {});

      const existingPlain = prev.find((item) => item.lineId === plainLineId);

      if (existingPlain) {
        const nextQty = existingPlain.quantity + quantity;
        trackUnitPrice = existingPlain.price;
        trackQty = nextQty;
        return prev.map((item) =>
          item.lineId === plainLineId ? { ...item, quantity: nextQty } : item,
        );
      }

      trackUnitPrice = variation ? variation.price : product.price;
      const lineImage = variation?.image?.trim() ? variation.image : product.image;

      return [
        ...prev,
        {
          lineId: plainLineId,
          productId: product.id,
          name: decodeImportedProductTitle(product.name),
          price: variation ? variation.price : product.price,
          currency: product.currency,
          image: lineImage,
          quantity,
          variationId: variation?.id,
          variationLabel: variation?.label,
        },
      ];
    });
    trackTikTokAddToCart(product, trackQty, trackUnitPrice);
    setIsOpen(true);
  };

  const removeItem = (lineId: string) => {
    setItems((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(lineId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, quantity } : item)),
    );
  };

  const updateBundleTier = (lineId: string, tierId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.lineId === lineId);
      const product = item ? getProductById(item.productId) : null;
      if (!product?.cartBundlePromos) {
        return prev;
      }
      const tier = getBundleTierById(product, tierId);
      if (!tier) {
        return prev;
      }
      return prev.map((row) =>
        row.lineId === lineId
          ? {
              ...row,
              price: tier.price,
              bundleListUnit: tier.listSubtotal,
              selectedBundleTierId: tier.id,
            }
          : row,
      );
    });
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const clearCart = () => {
    setItems([]);
    setOrderSuccess(null);
  };

  const cartSummaryByCurrency = items.reduce<Record<string, { list: number; paid: number }>>((acc, item) => {
    const c = item.currency;
    const listLine = lineListUnit(item) * item.quantity;
    const paidLine = lineUnitPrice(item) * item.quantity;
    acc[c] = acc[c] || { list: 0, paid: 0 };
    acc[c].list += listLine;
    acc[c].paid += paidLine;
    return acc;
  }, {});

  const primaryCurrency = Object.keys(cartSummaryByCurrency)[0] ?? "EUR";
  const primarySummary = cartSummaryByCurrency[primaryCurrency] ?? { list: 0, paid: 0 };
  const checkoutDiscount = primarySummary.list - primarySummary.paid;
  const checkoutTotal = primarySummary.paid;

  const singleItem = items.length === 1 ? items[0] : null;
  const bundleProduct = singleItem ? getProductById(singleItem.productId) : null;
  const showBundlePromos = Boolean(bundleProduct?.cartBundlePromos && singleItem);

  const analyticsFunnel: CartAnalyticsFunnel = {
    cartItemsCount: totalItems,
    cartOpen: isOpen,
    checkoutActive:
      isOpen &&
      items.length > 0 &&
      !orderSuccess &&
      !(showBundlePromos && singleItem && bundleProduct),
  };

  const value = {
    items,
    isOpen,
    totalItems,
    analyticsFunnel,
    addItem,
    removeItem,
    updateQuantity,
    openCart: () => {
      if (items.length > 0) {
        trackTikTokInitiateCheckout(items);
      }
      setIsOpen(true);
    },
    closeCart: () => setIsOpen(false),
    clearCart,
  };

  const closeCart = () => setIsOpen(false);

  return (
    <CartContext.Provider value={value}>
      {children}

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto bg-black/25 opacity-100" : "pointer-events-none bg-black/0 opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
      >
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-4 shadow-xl transition-transform duration-300 ease-out md:p-5 ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Winkelwagen</h2>
            <button
              type="button"
              className="rounded-full border border-[#B38F27] px-3 py-1 text-sm text-[var(--foreground)]"
              onClick={() => setIsOpen(false)}
            >
              Sluiten
            </button>
          </div>

          {orderSuccess ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-[var(--foreground)]">
              <p className="font-semibold text-green-800">Bestelling geplaatst!</p>
              <p className="mt-2">
                Bestelnummer: <strong>{orderSuccess}</strong>
              </p>
              <p className="mt-2 text-[var(--foreground)]/80">We nemen contact op voor bevestiging en levering.</p>
              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-[#B38F27] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                onClick={() => {
                  setOrderSuccess(null);
                  setIsOpen(false);
                }}
              >
                Sluiten
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--foreground)]/70">Je winkelwagen is leeg.</p>
          ) : showBundlePromos && singleItem && bundleProduct ? (
            <CartBundlePromoPanel
              item={singleItem}
              product={bundleProduct}
              onTierChange={(tierId) => updateBundleTier(singleItem.lineId, tierId)}
              onRemove={() => removeItem(singleItem.lineId)}
            />
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.lineId} className="rounded-xl border border-[#e5dcc8] p-3">
                  <div className="flex items-start gap-3">
                    <OptimizedProductImage
                      src={item.image}
                      alt={item.name}
                      variant="cartThumb"
                      className="object-cover"
                      wrapperClassName="h-16 w-16 shrink-0 rounded-md"
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="line-clamp-2 break-words text-sm font-semibold text-[var(--foreground)]">
                        {item.name}
                      </p>
                      {(() => {
                        if (item.lineId.startsWith("b:")) {
                          return null;
                        }
                        const rowProduct = getProductById(item.productId);
                        const wcSorted = sortVariationsForDisplay(rowProduct?.wcVariations);
                        if (wcSorted && wcSorted.length > 1) {
                          return (
                            <div className="mt-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)]/55">
                                Variant
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {wcSorted.map((v) => {
                                  const active = item.variationId === v.id;
                                  const label = shortVariationLabel(v.label);
                                  if (active) {
                                    return (
                                      <span
                                        key={v.id}
                                        className="rounded-full border border-[#B38F27] bg-[#B38F27] px-2.5 py-1 text-xs font-semibold text-white"
                                      >
                                        {label}
                                      </span>
                                    );
                                  }
                                  return (
                                    <Link
                                      key={v.id}
                                      href={`${rowProduct ? productPath(rowProduct) : `/product/${item.productId}`}?variation=${v.id}`}
                                      onClick={closeCart}
                                      scroll
                                      className="rounded-full border border-[#e5dcc8] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#B38F27]/40"
                                    >
                                      {label}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return item.variationLabel ? (
                          <p className="mt-0.5 text-xs text-[var(--foreground)]/70">{item.variationLabel}</p>
                        ) : null;
                      })()}
                      {item.bundleListUnit != null && item.bundleListUnit > item.price + 0.005 ? (
                        <div className="mt-1 space-y-1">
                          <p className="flex flex-wrap items-baseline gap-2 text-sm text-[var(--foreground)]/80">
                            <span className="text-[var(--foreground)]/45 line-through">
                              {formatProductPrice(item.bundleListUnit, item.currency)}
                            </span>
                            <span className="font-semibold text-[var(--foreground)]">
                              {formatProductPrice(item.price, item.currency)}
                            </span>
                          </p>
                          <p className="text-xs font-semibold text-red-600">
                            Besparing:{" "}
                            {formatProductPrice(
                              (item.bundleListUnit - item.price) * item.quantity,
                              item.currency,
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-[var(--foreground)]/80">
                          {formatProductPrice(lineUnitPrice(item), item.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-[#B38F27] px-2"
                        onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold text-[var(--foreground)]">{item.quantity}</span>
                      <button
                        type="button"
                        className="rounded border border-[#B38F27] px-2"
                        onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--foreground)]/70 underline"
                      onClick={() => removeItem(item.lineId)}
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}

              <ShopDeliveryTrustPanel
                subtotalAmount={checkoutTotal}
                currency={primaryCurrency}
                className="mb-1"
              />

              <div className="rounded-xl border border-[#e5dcc8] bg-[#faf9fc] p-3">
                {Object.entries(cartSummaryByCurrency).map(([currency, row]) => {
                  const discount = row.list - row.paid;
                  return (
                    <div key={currency} className="space-y-2 text-sm text-[var(--foreground)]">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatProductPrice(row.list, currency)}</span>
                      </div>
                      {discount > 0.005 ? (
                        <div className="flex justify-between">
                          <span className="font-semibold text-red-600">Korting</span>
                          <span className="font-semibold text-red-600">
                            -{formatProductPrice(discount, currency)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between border-t border-[#e5dcc8] pt-2 text-base font-bold">
                        <span>Total</span>
                        <span>{formatProductPrice(row.paid, currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <CartCheckoutForm
                items={items}
                currency={primaryCurrency}
                subtotal={primarySummary.list}
                discountTotal={checkoutDiscount}
                total={checkoutTotal}
                onSuccess={(orderNumber) => {
                  trackTikTokPurchase(items, checkoutTotal, primaryCurrency, orderNumber);
                  setItems([]);
                  setOrderSuccess(orderNumber);
                }}
              />
            </div>
          )}
        </aside>
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
