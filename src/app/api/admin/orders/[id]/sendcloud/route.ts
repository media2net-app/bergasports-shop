import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { getOrderById } from "@/lib/orders-db";
import { createAndAttachSendcloudLabelForOrder } from "@/lib/sendcloud-order";
import { isSendcloudConfigured } from "@/lib/sendcloud";

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
    const result = await createAndAttachSendcloudLabelForOrder(order, { markShipped: true });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.skipped ? 400 : 500 });
    }
    return NextResponse.json({
      ok: true,
      tracking_code: result.trackingCode,
      tracking_url: result.trackingUrl,
      label_url: result.labelUrl,
      parcel_id: result.parcelId,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sendcloud mislukt" }, { status: 500 });
  }
}
