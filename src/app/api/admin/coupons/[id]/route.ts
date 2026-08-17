import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteAdminCoupon, updateAdminCoupon } from "@/lib/coupons-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Ontbrekende id" }, { status: 400 });
  }
  let body: {
    code?: string;
    type?: "percent" | "fixed";
    amount?: number;
    minSubtotal?: number | null;
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const coupon = await updateAdminCoupon(id, body);
    return NextResponse.json({ coupon });
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
  if (!id) {
    return NextResponse.json({ error: "Ontbrekende id" }, { status: 400 });
  }
  try {
    await deleteAdminCoupon(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verwijderen mislukt" },
      { status: 400 },
    );
  }
}
