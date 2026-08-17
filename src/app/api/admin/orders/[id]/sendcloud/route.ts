import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { getOrderById, updateOrderFulfillment, updateOrderStatus } from "@/lib/orders-db";
import { createSendcloudParcel, isSendcloudConfigured } from "@/lib/sendcloud";

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
  if (!(await isSendcloudConfigured())) {
    return NextResponse.json({ error: "Sendcloud is niet geconfigureerd in Instellingen." }, { status: 400 });
  }
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  try {
    const parcel = await createSendcloudParcel({
      name: order.customer_name,
      address: order.shipping_address,
      city: order.shipping_city,
      postalCode: order.shipping_postal_code ?? "",
      email: order.customer_email,
      telephone: order.customer_phone,
      orderNumber: order.order_number,
    });
    const tracking = parcel.tracking_number ?? "";
    const trackingUrl = parcel.tracking_url ?? "";
    const label =
      parcel.label?.label_printer || parcel.label?.normal_printer?.[0] || null;
    await updateOrderFulfillment(id, {
      tracking_code: tracking || null,
      tracking_url: trackingUrl || null,
      shipping_carrier: parcel.carrier?.name ?? "Sendcloud",
      sendcloud_parcel_id: parcel.id,
      sendcloud_label_url: label,
    });
    if (order.status !== "shipped" && order.status !== "delivered") {
      await updateOrderStatus(id, "shipped");
    }
    return NextResponse.json({
      ok: true,
      tracking_code: tracking,
      tracking_url: trackingUrl,
      label_url: label,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sendcloud mislukt" }, { status: 500 });
  }
}
