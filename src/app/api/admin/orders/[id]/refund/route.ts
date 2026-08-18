import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { formatMollieAmount, refundMolliePayment } from "@/lib/mollie";
import { getOrderById, updateOrderFulfillment, updateOrderStatus } from "@/lib/orders-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function money2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function POST(request: Request, context: Ctx) {
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

  let amount = order.total;
  try {
    const body = (await request.json().catch(() => ({}))) as { amount?: number };
    if (body.amount != null) {
      amount = money2(Number(body.amount));
    }
  } catch {
    amount = order.total;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Vul een geldig terugbetaalbedrag in." }, { status: 400 });
  }
  if (amount > order.total + 0.009) {
    return NextResponse.json({ error: "Bedrag mag niet hoger zijn dan het ordertotaal." }, { status: 400 });
  }

  const alreadyRefunded = order.refund_amount ?? 0;
  if (alreadyRefunded + amount > order.total + 0.009) {
    return NextResponse.json({ error: "Dit bedrag overschrijdt het resterende totaal." }, { status: 400 });
  }

  try {
    await refundMolliePayment(order.mollie_payment_id, formatMollieAmount(amount, order.currency));
    const refundedTotal = money2(alreadyRefunded + amount);
    const full = refundedTotal >= order.total - 0.009;
    await updateOrderFulfillment(id, {
      refunded_at: new Date(),
      refund_amount: refundedTotal,
      payment_status: full ? "refunded" : "partially_refunded",
    });
    if (full) {
      await updateOrderStatus(id, "cancelled");
    }
    return NextResponse.json({ ok: true, amount, refunded_total: refundedTotal, full });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Terugbetaling mislukt" },
      { status: 500 },
    );
  }
}
