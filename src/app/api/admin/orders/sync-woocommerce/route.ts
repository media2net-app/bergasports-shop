import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { isWooCommerceApiConfigured } from "@/lib/woocommerce-api";
import { syncWooCommerceOrders } from "@/lib/woocommerce-orders-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  if (!(await isWooCommerceApiConfigured())) {
    return NextResponse.json(
      { error: "WC_CONSUMER_KEY / WC_CONSUMER_SECRET ontbreken." },
      { status: 503 },
    );
  }

  let modifiedAfter: string | undefined;
  let maxPages: number | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      modifiedAfter?: string;
      maxPages?: number;
      recentDays?: number;
    };
    if (typeof body.modifiedAfter === "string" && body.modifiedAfter.trim()) {
      modifiedAfter = body.modifiedAfter.trim();
    } else if (typeof body.recentDays === "number" && body.recentDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() - body.recentDays);
      modifiedAfter = d.toISOString();
    }
    if (typeof body.maxPages === "number" && body.maxPages > 0) {
      maxPages = Math.min(200, body.maxPages);
    }
  } catch {
    /* empty body ok */
  }

  try {
    const result = await syncWooCommerceOrders({ modifiedAfter, maxPages });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
