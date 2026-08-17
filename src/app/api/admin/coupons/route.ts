import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { createAdminCoupon, listAdminCoupons } from "@/lib/coupons-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const coupons = await listAdminCoupons();
    return NextResponse.json({ coupons });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon kortingscodes niet laden" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: {
    code?: string;
    type?: string;
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
  const type = body.type === "fixed" ? "fixed" : "percent";
  const amount = Number(body.amount);
  try {
    const coupon = await createAdminCoupon({
      code: body.code ?? "",
      type,
      amount,
      minSubtotal: body.minSubtotal == null ? null : Number(body.minSubtotal),
      active: body.active,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });
    return NextResponse.json({ coupon });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Aanmaken mislukt" },
      { status: 400 },
    );
  }
}
