import { NextResponse } from "next/server";

import { geoFromRequestHeaders } from "@/lib/analytics-geo";
import { productIdFromPath, recordAnalyticsPing } from "@/lib/analytics-db";

export const dynamic = "force-dynamic";

type PingBody = {
  visitorId?: string;
  sessionId?: string;
  path?: string;
  productId?: number | null;
  referrer?: string | null;
  cartItemsCount?: number;
  cartOpen?: boolean;
  checkoutActive?: boolean;
};

export async function POST(request: Request) {
  let body: PingBody;
  try {
    body = (await request.json()) as PingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const visitorId = body.visitorId?.trim();
  const sessionId = body.sessionId?.trim();
  const path = body.path?.trim() || "/";

  if (!visitorId || !sessionId || visitorId.length > 80 || sessionId.length > 80) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  if (path.length > 500 || path.startsWith("/admin")) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const productId =
    body.productId != null && Number.isFinite(body.productId)
      ? Number(body.productId)
      : productIdFromPath(path);

  try {
    await recordAnalyticsPing({
      visitorId,
      sessionId,
      path,
      productId,
      referrer: body.referrer?.trim().slice(0, 500) || null,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
      geo: geoFromRequestHeaders(request.headers),
      cartItemsCount: body.cartItemsCount,
      cartOpen: body.cartOpen,
      checkoutActive: body.checkoutActive,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    console.error("[analytics/ping]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
