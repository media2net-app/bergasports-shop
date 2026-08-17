import "server-only";

import { requirePrisma } from "@/lib/database";
import { getRuntimeSetting } from "@/lib/site-settings-db";

export async function repeatOrderDiscountPercent(): Promise<number> {
  const raw = Number((await getRuntimeSetting("REPEAT_ORDER_DISCOUNT_PERCENT")).trim() || "10");
  if (!Number.isFinite(raw) || raw <= 0 || raw > 30) {
    return 10;
  }
  return raw;
}

export async function repeatOrderPromoCode(): Promise<string> {
  return (await getRuntimeSetting("REPEAT_ORDER_PROMO_CODE")).trim() || "CLIENT10";
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

export async function applyRepeatDiscount(subtotal: number, discountTotal: number): Promise<{
  discountTotal: number;
  repeatDiscountApplied: number;
}> {
  const percent = await repeatOrderDiscountPercent();
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
