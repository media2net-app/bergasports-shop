import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { getOrderById, updateOrderStatus } from "@/lib/orders-db";

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

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const order = await updateOrderStatus(id, status as OrderStatus);
    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
