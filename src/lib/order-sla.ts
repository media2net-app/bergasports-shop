import "server-only";

import { requirePrisma } from "@/lib/database";

export type OrderSlaSummary = {
  pendingOlderThan24h: number;
  pendingTotal: number;
};

export async function getOrderSlaSummary(slaHours = 24): Promise<OrderSlaSummary> {
  const prisma = requirePrisma();
  const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000);

  const [pendingTotal, pendingOlderThan24h] = await Promise.all([
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({
      where: { status: "pending", createdAt: { lt: cutoff } },
    }),
  ]);

  return { pendingTotal, pendingOlderThan24h };
}
