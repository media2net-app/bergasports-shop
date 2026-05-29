import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  getMarketingChannelInsight,
  saveMarketingChannelInsight,
  type MarketingCampaignRow,
} from "@/lib/marketing-channel-insights";
import { isMarketingChannelId } from "@/lib/marketing-channels";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function parseBody(body: unknown): {
  adSpendRon: number;
  attributedRevenueRon: number;
  impressions: number;
  clicks: number;
  conversions: number;
  campaigns: MarketingCampaignRow[];
  notes: string | null;
} | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const o = body as Record<string, unknown>;
  const campaigns = Array.isArray(o.campaigns)
    ? (o.campaigns as unknown[]).map((item, index) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const status = row.status;
        const validStatus: MarketingCampaignRow["status"] =
          status === "active" || status === "paused" || status === "ended" ? status : "active";
        return {
          id: String(row.id ?? `c-${index}`),
          name: String(row.name ?? ""),
          status: validStatus,
          budgetRon: Number(row.budgetRon ?? 0) || 0,
          spendRon: Number(row.spendRon ?? 0) || 0,
          impressions: Number(row.impressions ?? 0) || 0,
          clicks: Number(row.clicks ?? 0) || 0,
          conversions: Number(row.conversions ?? 0) || 0,
          notes: String(row.notes ?? ""),
        };
      })
    : [];

  return {
    adSpendRon: Number(o.adSpendRon ?? 0) || 0,
    attributedRevenueRon: Number(o.attributedRevenueRon ?? 0) || 0,
    impressions: Number(o.impressions ?? 0) || 0,
    clicks: Number(o.clicks ?? 0) || 0,
    conversions: Number(o.conversions ?? 0) || 0,
    campaigns,
    notes: o.notes != null ? String(o.notes) : null,
  };
}

type RouteContext = { params: Promise<{ channel: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  const { channel } = await context.params;
  if (!isMarketingChannelId(channel)) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  const insight = await getMarketingChannelInsight(channel);
  return NextResponse.json(insight);
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  const { channel } = await context.params;
  if (!isMarketingChannelId(channel)) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    await saveMarketingChannelInsight(channel, parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
