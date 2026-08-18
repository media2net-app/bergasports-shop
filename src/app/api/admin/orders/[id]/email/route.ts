import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { resendOrderStatusEmail } from "@/lib/orders-db";
import {
  ORDER_STATUS_EMAIL_KINDS,
  type OrderStatusEmailKind,
} from "@/lib/order-email-kinds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  let kind: OrderStatusEmailKind | undefined;
  try {
    const body = (await request.json()) as { kind?: string };
    if (body.kind && ORDER_STATUS_EMAIL_KINDS.includes(body.kind as OrderStatusEmailKind)) {
      kind = body.kind as OrderStatusEmailKind;
    }
  } catch {
    kind = undefined;
  }
  if (!kind) {
    return NextResponse.json({ error: "Kies een mailtype." }, { status: 400 });
  }

  try {
    await resendOrderStatusEmail(id, kind);
    return NextResponse.json({ ok: true, kind });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mail versturen mislukt" },
      { status: 400 },
    );
  }
}
