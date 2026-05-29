import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { listOrders } from "@/lib/orders-db";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status") ?? "all";
  const status: OrderStatus | "all" =
    rawStatus === "all" || ORDER_STATUSES.includes(rawStatus as OrderStatus)
      ? (rawStatus as OrderStatus | "all")
      : "all";
  const esync = url.searchParams.get("esync") ?? "all";

  const { orders } = await listOrders({
    status,
    easySalesSync:
      esync === "failed" || esync === "pending" || esync === "synced" ? esync : "all",
    page: 1,
    pageSize: 5000,
  });

  const header = [
    "order_number",
    "status",
    "customer_name",
    "customer_phone",
    "customer_email",
    "total",
    "currency",
    "payment_method",
    "shipping_city",
    "created_at",
    "easy_sales_sync_status",
  ];

  const lines = [
    header.join(","),
    ...orders.map((o) =>
      [
        o.order_number,
        ORDER_STATUS_LABEL[o.status] ?? o.status,
        o.customer_name,
        o.customer_phone,
        o.customer_email ?? "",
        o.total,
        o.currency,
        o.payment_method,
        o.shipping_city,
        o.created_at,
        o.easy_sales_sync_status ?? "",
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  const body = `\uFEFF${lines.join("\n")}\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-shop-${stamp}.csv"`,
    },
  });
}
