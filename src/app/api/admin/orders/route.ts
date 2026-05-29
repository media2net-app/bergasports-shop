import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { countOrdersByStatus, listOrders } from "@/lib/orders-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status");
  const status: OrderStatus | "all" =
    rawStatus && (rawStatus === "all" || ORDER_STATUSES.includes(rawStatus as OrderStatus))
      ? (rawStatus as OrderStatus | "all")
      : "all";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  try {
    const [list, counts] = await Promise.all([
      listOrders({ status, page, pageSize: 25 }),
      countOrdersByStatus(),
    ]);
    return NextResponse.json({ ...list, counts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
