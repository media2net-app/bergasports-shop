import { NextResponse } from "next/server";

import { getMolliePayment, parseMollieMetadata } from "@/lib/mollie";
import {
  getOrderByMolliePaymentId,
  getOrderByNumber,
  markMollieOrderPaid,
} from "@/lib/orders-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mollie Payments API webhook — form body: id=tr_xxx
 * https://docs.mollie.com/reference/payments-api-webhooks
 */
export async function POST(request: Request) {
  let paymentId = "";
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      paymentId = String(form.get("id") || "").trim();
    } else if (contentType.includes("application/json")) {
      const body = (await request.json()) as { id?: string };
      paymentId = String(body.id || "").trim();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      paymentId = (params.get("id") || "").trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid webhook body" }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  try {
    const payment = await getMolliePayment(paymentId);
    const meta = parseMollieMetadata(payment.metadata);
    let order =
      (await getOrderByMolliePaymentId(paymentId)) ||
      (meta.orderNumber ? await getOrderByNumber(meta.orderNumber) : null) ||
      (meta.orderId ? await getOrderByMolliePaymentId(paymentId) : null);

    if (!order && meta.orderId) {
      const { getOrderById } = await import("@/lib/orders-db");
      order = await getOrderById(Number(meta.orderId));
    }

    if (!order) {
      console.error("[mollie-webhook] order not found for", paymentId, meta);
      return new NextResponse("OK", { status: 200 });
    }

    if (payment.status === "paid") {
      await markMollieOrderPaid(order.id);
    } else if (
      payment.status === "canceled" ||
      payment.status === "expired" ||
      payment.status === "failed"
    ) {
      // Leave as awaiting_payment so customer can retry; admin can cancel manually.
      console.info("[mollie-webhook]", order.order_number, payment.status);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e) {
    console.error("[mollie-webhook]", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
