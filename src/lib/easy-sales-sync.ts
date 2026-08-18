import "server-only";

import { requirePrisma } from "@/lib/database";
import { syncOrderToEasySales } from "@/lib/easy-sales";
import type { CreateOrderInput } from "@/lib/orders";

export type EasySalesOrderPushInput = CreateOrderInput & {
  orderNumber: string;
  createdAt?: string;
};

export async function pushOrderToEasySalesAfterCreate(
  orderId: number,
  input: EasySalesOrderPushInput,
): Promise<void> {
  const result = await syncOrderToEasySales(input);
  const prisma = requirePrisma();
  const now = new Date();

  const patch = result.ok
    ? {
        easySalesSyncStatus: "synced" as const,
        easySalesSyncError: null,
        easySalesSyncedAt: now,
      }
    : {
        easySalesSyncStatus: "failed" as const,
        easySalesSyncError: result.error.slice(0, 2000),
        easySalesSyncedAt: now,
      };

  try {
    await prisma.order.update({
      where: { id: BigInt(orderId) },
      data: patch,
    });
  } catch (e) {
    console.error(
      "[easy-sales] Could not update order sync status:",
      e instanceof Error ? e.message : e,
    );
  }

  if (!result.ok) {
    console.error("[easy-sales] Order sync failed:", orderId, result.error);
  }
}
