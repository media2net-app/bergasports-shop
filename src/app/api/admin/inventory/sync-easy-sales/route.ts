import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { syncStockFromEasySales } from "@/lib/easy-sales-stock-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const summary = await syncStockFromEasySales();
  if (!summary.ok) {
    return NextResponse.json(summary, { status: 502 });
  }

  return NextResponse.json(summary);
}
