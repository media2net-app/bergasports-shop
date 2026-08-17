import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { formatMollieAmount, refundMolliePayment } from "@/lib/mollie";
import { getOrderById, updateOrderFulfillment, updateOrderStatus } from "@/lib/orders-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (!order.mollie_payment_id) {
    return NextResponse.json({ error: "Geen Mollie-betaling gekoppeld." }, { status: 400 });
  }
  try {
    await refundMolliePayment(order.mollie_payment_id, formatMollieAmount(order.total, order.currency));
    await updateOrderFulfillment(id, {
      refunded_at: new Date(),
      refund_amount: order.total,
      payment_status: "refunded",
    });
    await updateOrderStatus(id, "cancelled");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Terugbetaling mislukt" }, { status: 500 });
  }
}
