import "server-only";

import { requirePrisma } from "@/lib/database";

export function repeatOrderDiscountPercent(): number {
  const raw = Number(process.env.REPEAT_ORDER_DISCOUNT_PERCENT?.trim() || "10");
  if (!Number.isFinite(raw) || raw <= 0 || raw > 30) {
    return 10;
  }
  return raw;
}

export function repeatOrderPromoCode(): string {
  return process.env.REPEAT_ORDER_PROMO_CODE?.trim() || "CLIENT10";
}

export async function customerQualifiesForRepeatDiscount(customerPhone: string): Promise<boolean> {
  const phone = customerPhone.trim();
  if (!phone) {
    return false;
  }
  const prisma = requirePrisma();
  const count = await prisma.order.count({
    where: { customerPhone: phone, status: { not: "cancelled" } },
  });
  return count > 0;
}

export function applyRepeatDiscount(subtotal: number, discountTotal: number): {
  discountTotal: number;
  repeatDiscountApplied: number;
} {
  const percent = repeatOrderDiscountPercent();
  const repeatAmount = Math.round(subtotal * (percent / 100) * 100) / 100;
  if (repeatAmount <= 0) {
    return { discountTotal, repeatDiscountApplied: 0 };
  }
  const nextDiscount = Math.max(discountTotal, repeatAmount);
  return {
    discountTotal: nextDiscount,
    repeatDiscountApplied: Math.round((nextDiscount - discountTotal) * 100) / 100,
  };
}
