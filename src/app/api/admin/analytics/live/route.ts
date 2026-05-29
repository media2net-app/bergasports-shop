import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getAnalyticsLiveSnapshot } from "@/lib/analytics-live";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  const period = new URL(request.url).searchParams.get("period");

  try {
    const snapshot = await getAnalyticsLiveSnapshot(period);
    return NextResponse.json(snapshot);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    console.error("[admin/analytics/live]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
