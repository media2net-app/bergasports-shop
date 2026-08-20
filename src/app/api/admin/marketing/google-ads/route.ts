import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { fetchGoogleAdsPeriodMetrics } from "@/lib/google-ads-api";
import { saveMarketingChannelInsight } from "@/lib/marketing-channel-insights";
import { parsePerformancePeriod } from "@/lib/marketing-performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sync Google Ads metrics into marketing_channel_insights (google_ads). */
export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let period = parsePerformancePeriod("30d");
  try {
    const body = (await request.json()) as { period?: string };
    if (body?.period) {
      period = parsePerformancePeriod(body.period);
    }
  } catch {
    // empty body → default 30d
  }

  try {
    const metrics = await fetchGoogleAdsPeriodMetrics(period);
    await saveMarketingChannelInsight("google_ads", {
      adSpendRon: metrics.spend,
      attributedRevenueRon: metrics.conversionValue,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      conversions: Math.round(metrics.conversions),
      campaigns: metrics.campaigns,
      notes: `Gesynchroniseerd uit Google Ads API · ${metrics.dateRangeLabel} · ${metrics.fetchedAt}`,
    });

    return NextResponse.json({
      ok: true,
      metrics,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google Ads sync mislukt" },
      { status: 500 },
    );
  }
}
