import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  createShippingRate,
  listAdminShippingRates,
  seedDefaultShippingRates,
} from "@/lib/shipping-rates-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const rates = await listAdminShippingRates();
    return NextResponse.json({ rates });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon tarieven niet laden" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: {
    seed?: boolean;
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
    if (body.seed) {
      const rates = await seedDefaultShippingRates();
      return NextResponse.json({ rates });
    }
    const rate = await createShippingRate({
      countryCode: body.countryCode ?? "",
      label: body.label ?? "",
      method: body.method ?? "standard",
      price: Number(body.price),
      freeAbove: body.freeAbove == null ? null : Number(body.freeAbove),
      estimatedDays: body.estimatedDays,
      active: body.active,
      sortOrder: body.sortOrder,
    });
    return NextResponse.json({ rate });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Opslaan mislukt" },
      { status: 400 },
    );
  }
}
