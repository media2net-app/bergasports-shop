import "server-only";

import { getPrisma } from "@/lib/prisma";

export type CouponResult =
  | { ok: true; code: string; type: string; amount: number; discount: number }
  | { ok: false; error: string };

export async function applyCouponCode(
  codeRaw: string,
  subtotal: number,
): Promise<CouponResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Voer een kortingscode in." };

  const prisma = getPrisma();
  if (!prisma) {
    // Built-in welcome coupon when DB table not ready
    if (code === "WELCOME5" && subtotal > 0) {
      const discount = Math.min(subtotal, Math.round(subtotal * 0.05 * 100) / 100);
      return { ok: true, code, type: "percent", amount: 5, discount };
    }
    return { ok: false, error: "Ongeldige kortingscode." };
  }

  try {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) return { ok: false, error: "Ongeldige kortingscode." };
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { ok: false, error: "Deze code is nog niet geldig." };
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      return { ok: false, error: "Deze code is verlopen." };
    }
    const min = coupon.minSubtotal != null ? Number(coupon.minSubtotal) : 0;
    if (subtotal < min) {
      return { ok: false, error: `Minimaal bestelbedrag € ${min.toFixed(2)}.` };
    }
    const amount = Number(coupon.amount);
    const discount =
      coupon.type === "fixed"
        ? Math.min(subtotal, amount)
        : Math.min(subtotal, Math.round(subtotal * (amount / 100) * 100) / 100);
    return { ok: true, code, type: coupon.type, amount, discount };
  } catch {
    if (code === "WELCOME5" && subtotal > 0) {
      const discount = Math.min(subtotal, Math.round(subtotal * 0.05 * 100) / 100);
      return { ok: true, code, type: "percent", amount: 5, discount };
    }
    return { ok: false, error: "Ongeldige kortingscode." };
  }
}
