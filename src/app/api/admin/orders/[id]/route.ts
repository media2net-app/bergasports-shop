import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { getOrderById, updateOrderFulfillment, updateOrderStatus } from "@/lib/orders-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  let body: {
    status?: string;
    customer_name?: string;
    customer_email?: string | null;
    customer_phone?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_county?: string | null;
    shipping_postal_code?: string | null;
    notes?: string | null;
    tracking_code?: string | null;
    tracking_url?: string | null;
    shipping_carrier?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.status) {
      if (!ORDER_STATUSES.includes(body.status as OrderStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const order = await updateOrderStatus(id, body.status as OrderStatus);
      return NextResponse.json(order);
    }
    const order = await updateOrderFulfillment(id, body);
    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
