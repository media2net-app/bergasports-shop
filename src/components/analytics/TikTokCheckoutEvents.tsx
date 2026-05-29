"use client";

import { useEffect, useRef } from "react";

import type { CartItem } from "@/components/cart/CartProvider";
import { trackTikTokAddPaymentInfo } from "@/lib/tiktok-pixel";

type Props = {
  items: CartItem[];
  total: number;
  currency: string;
};

/** Fires AddPaymentInfo once when checkout form is shown (COD). */
export default function TikTokCheckoutEvents({ items, total, currency }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !items.length) return;
    fired.current = true;
    trackTikTokAddPaymentInfo(items, total, currency);
  }, [items, total, currency]);

  return null;
}
