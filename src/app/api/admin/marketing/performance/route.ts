import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  getMarketingPerformanceSnapshot,
  parsePerformancePeriod,
} from "@/lib/marketing-performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const url = new URL(request.url);
  const period = parsePerformancePeriod(url.searchParams.get("period"));

  try {
    const snapshot = await getMarketingPerformanceSnapshot(period);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kon performance niet laden" },
      { status: 500 },
    );
  }
}
