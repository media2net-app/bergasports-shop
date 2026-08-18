import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { getMolliePayment } from "@/lib/mollie";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import {
  deleteOrder,
  getOrderById,
  updateOrderFulfillment,
  updateOrderItems,
  updateOrderStatus,
  type AdminOrderItemWrite,
} from "@/lib/orders-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function withLiveMollie(order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>) {
  if (!order.mollie_payment_id) {
    return { ...order, mollie: null as { id: string; status: string; amount: string } | null };
  }
  try {
    const payment = await getMolliePayment(order.mollie_payment_id);
    if (payment.status && payment.status !== order.payment_status) {
      await updateOrderFulfillment(order.id, { payment_status: payment.status });
    }
    return {
      ...order,
      payment_status: payment.status,
      mollie: {
        id: payment.id,
        status: payment.status,
        amount: `${payment.amount.value} ${payment.amount.currency}`,
      },
    };
  } catch {
    return { ...order, mollie: null };
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(await withLiveMollie(order));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kon bestelling niet laden";
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
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  let body: {
    status?: string;
    items?: AdminOrderItemWrite[];
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
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  try {
    if (body.items) {
      const order = await updateOrderItems(id, body.items);
      return NextResponse.json(order);
    }
    if (body.status) {
      if (!ORDER_STATUSES.includes(body.status as OrderStatus)) {
        return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
      }
      const order = await updateOrderStatus(id, body.status as OrderStatus);
      return NextResponse.json(order);
    }
    const order = await updateOrderFulfillment(id, body);
    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bijwerken mislukt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  try {
    await deleteOrder(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verwijderen mislukt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
