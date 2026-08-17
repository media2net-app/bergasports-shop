import "server-only";

import { requirePrisma } from "@/lib/database";

export type ShopCustomerRow = {
  key: string;
  name: string;
  email: string | null;
  phone: string;
  orderCount: number;
  totalSpent: number;
  currency: string;
  lastOrderAt: string;
  lastOrderNumber: string;
  hasAccount: boolean;
};

export async function listShopCustomers(): Promise<ShopCustomerRow[]> {
  const prisma = requirePrisma();
  const [orders, accounts] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: {
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        total: true,
        currency: true,
        createdAt: true,
        orderNumber: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ select: { email: true } }).catch(() => [] as { email: string }[]),
  ]);

  const accountEmails = new Set(accounts.map((a) => a.email.trim().toLowerCase()).filter(Boolean));
  const byKey = new Map<string, ShopCustomerRow>();

  for (const order of orders) {
    const email = order.customerEmail?.trim().toLowerCase() || null;
    const phone = order.customerPhone.trim();
    const key = email || (phone ? `tel:${phone}` : `order:${order.orderNumber}`);
    const existing = byKey.get(key);
    const total = Number(order.total);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += Number.isFinite(total) ? total : 0;
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;
      continue;
    }
    byKey.set(key, {
      key,
      name: order.customerName,
      email,
      phone,
      orderCount: 1,
      totalSpent: Number.isFinite(total) ? total : 0,
      currency: order.currency || "EUR",
      lastOrderAt: order.createdAt.toISOString(),
      lastOrderNumber: order.orderNumber,
      hasAccount: Boolean(email && accountEmails.has(email)),
    });
  }

  return [...byKey.values()].sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
}
