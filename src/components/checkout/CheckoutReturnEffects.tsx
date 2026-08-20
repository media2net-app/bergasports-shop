"use client";

import { useEffect, useRef } from "react";

import { trackTikTokPurchase } from "@/lib/tiktok-pixel";

const STORAGE_KEY = "bergasports.mollieCheckout";

export type MollieCheckoutSnapshot = {
  orderNumber: string;
  total: number;
  currency: string;
  items: Array<{
    productId: number;
    name: string;
    price: number;
    quantity: number;
    currency: string;
  }>;
};

export function saveMollieCheckoutSnapshot(snapshot: MollieCheckoutSnapshot): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // private mode / quota — purchase pixel may be skipped
  }
}

function readSnapshot(): MollieCheckoutSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MollieCheckoutSnapshot;
  } catch {
    return null;
  }
}

function clearSnapshot(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

type Props = {
  orderNumber: string;
  paid: boolean;
};

/** After Mollie paid return: fire Purchase from the snapshot saved before redirect. */
export default function CheckoutReturnEffects({ orderNumber, paid }: Props) {
  const done = useRef(false);

  useEffect(() => {
    if (!paid || done.current) return;
    done.current = true;
    const snap = readSnapshot();
    clearSnapshot();
    if (!snap || snap.orderNumber !== orderNumber || !snap.items.length) return;
    trackTikTokPurchase(
      snap.items.map((item) => ({
        lineId: String(item.productId),
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        currency: item.currency,
        image: "",
      })),
      snap.total,
      snap.currency,
      orderNumber,
    );
  }, [paid, orderNumber]);

  return null;
}
