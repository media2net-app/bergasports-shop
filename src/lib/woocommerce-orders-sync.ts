import "server-only";

import { revalidatePath } from "next/cache";

import { requirePrisma } from "@/lib/database";
import {
  fetchWooCommerceOrders,
  isWooCommerceApiConfigured,
  type WooCommerceOrder,
} from "@/lib/woocommerce-api";
import { upsertWooCommerceOrderRecord } from "@/lib/wordpress-import-run";

export function wooCommerceOrderNumber(order: WooCommerceOrder): string {
  return `WC-${order.number || order.id}`;
}

export async function upsertWooCommerceOrder(
  order: WooCommerceOrder,
): Promise<"created" | "updated" | "skipped"> {
  return upsertWooCommerceOrderRecord(requirePrisma(), order);
}

export type WooCommerceOrdersSyncResult = {
  ok: true;
  fetched: number;
  created: number;
  updated: number;
  pages: number;
  totalRemote: number;
};

export async function syncWooCommerceOrders(options?: {
  maxPages?: number;
  /** ISO date — only orders modified after this */
  modifiedAfter?: string;
}): Promise<WooCommerceOrdersSyncResult> {
  if (!(await isWooCommerceApiConfigured())) {
    throw new Error("WooCommerce API keys ontbreken.");
  }

  let page = 1;
  let totalPages = 1;
  let totalRemote = 0;
  let fetched = 0;
  let created = 0;
  let updated = 0;
  const maxPages = options?.maxPages ?? 100;

  while (page <= totalPages && page <= maxPages) {
    const batch = await fetchWooCommerceOrders({
      page,
      perPage: 50,
      modifiedAfter: options?.modifiedAfter,
      order: "desc",
    });
    totalPages = batch.totalPages;
    totalRemote = batch.total;
    for (const order of batch.orders) {
      const result = await upsertWooCommerceOrder(order);
      fetched += 1;
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
    }
    page += 1;
  }

  revalidatePath("/admin/orders");
  return { ok: true, fetched, created, updated, pages: page - 1, totalRemote };
}
