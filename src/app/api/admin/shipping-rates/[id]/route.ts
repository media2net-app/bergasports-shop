import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteShippingRate, updateShippingRate } from "@/lib/shipping-rates-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  let body: {
    countryCode?: string;
    label?: string;
    method?: string;
    price?: number;
    freeAbove?: number | null;
    estimatedDays?: string | null;
    active?: boolean;
    sortOrder?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const rate = await updateShippingRate(id, body);
    return NextResponse.json({ rate });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bijwerken mislukt" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    await deleteShippingRate(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verwijderen mislukt" },
      { status: 400 },
    );
  }
}
