"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Product, WcVariationJson } from "@/lib/products";
import {
  decodeImportedProductTitle,
  getBundleTierById,
  isProductInStock,
  resolveBundleTierForAdd,
} from "@/lib/products";
import { useProductLookup } from "@/components/cart/ProductLookupProvider";
import CartDrawer from "@/components/cart/CartDrawer";
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

export function CartProvider({
  children,
  freeShippingThreshold,
}: {
  children: React.ReactNode;
  freeShippingThreshold?: number;
}) {
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
  const bundleProduct = singleItem ? getProductById(singleItem.productId) ?? null : null;
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

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer
        isOpen={isOpen}
        onClose={value.closeCart}
        items={items}
        orderSuccess={orderSuccess}
        onDismissSuccess={() => {
          setOrderSuccess(null);
          setIsOpen(false);
        }}
        showBundlePromos={showBundlePromos}
        singleItem={singleItem}
        bundleProduct={bundleProduct}
        onTierChange={(tierId) => {
          if (singleItem) {
            updateBundleTier(singleItem.lineId, tierId);
          }
        }}
        onRemove={removeItem}
        onUpdateQuantity={updateQuantity}
        cartSummaryByCurrency={cartSummaryByCurrency}
        checkoutTotal={checkoutTotal}
        primaryCurrency={primaryCurrency}
        checkoutDiscount={checkoutDiscount}
        primarySummary={primarySummary}
        freeShippingThreshold={freeShippingThreshold}
        onCheckoutSuccess={(orderNumber) => {
          trackTikTokPurchase(items, checkoutTotal, primaryCurrency, orderNumber);
          setItems([]);
          setOrderSuccess(orderNumber);
        }}
      />
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
