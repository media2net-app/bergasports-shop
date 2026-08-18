import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { cancelOrder } from "@/lib/orders-db";

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
  try {
    const result = await cancelOrder(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Annuleren mislukt" },
      { status: 400 },
    );
  }
}
