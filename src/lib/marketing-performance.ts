import "server-only";

import { requirePrisma } from "@/lib/database";
import {
  getDashboardPeriodLabel,
  type DashboardPeriod,
  parseStoredDashboardPeriod,
} from "@/lib/dashboard-period";
import { aggregateShopOrders, type ShopDashboardOrder } from "@/lib/dashboard-aggregates";
import { decimalToNumber } from "@/lib/prisma-mappers";
import { getMarketingChannelInsight } from "@/lib/marketing-channel-insights";
import { MARKETING_CHANNELS } from "@/lib/marketing-channels";
import { marketingChannelEnvStatusAsync } from "@/lib/marketing-channels-server";
import { computeChannelRoi } from "@/lib/marketing-channel-insights-shared";
import { getGoogleAdsApiStatus, fetchGoogleAdsPeriodMetrics } from "@/lib/google-ads-api";
import { getGa4ApiStatus, fetchGa4PeriodMetrics } from "@/lib/ga4-data-api";
import { getRuntimeSetting } from "@/lib/site-settings-db";
import type { MarketingPerformanceSnapshot } from "@/lib/marketing-performance-shared";

export type { MarketingPerformanceSnapshot } from "@/lib/marketing-performance-shared";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeRoas(revenue: number, spend: number): number | null {
  if (spend <= 0) return null;
  return round2(revenue / spend);
}

/** ROI = (revenue − spend) / spend */
export function computeRoi(revenue: number, spend: number): number | null {
  if (spend <= 0) return null;
  return round2((revenue - spend) / spend);
}

export function parsePerformancePeriod(raw: string | null): DashboardPeriod {
  return parseStoredDashboardPeriod(raw);
}

async function loadShopOrders(): Promise<ShopDashboardOrder[]> {
  const prisma = requirePrisma();
  const rows = await prisma.order.findMany({
    select: {
      createdAt: true,
      total: true,
      status: true,
      customerPhone: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return rows.map((row) => ({
    createdAt: row.createdAt.toISOString(),
    total: decimalToNumber(row.total) ?? 0,
    status: row.status,
    customerPhone: row.customerPhone ?? "",
  }));
}

export async function getMarketingPerformanceSnapshot(
  period: DashboardPeriod,
): Promise<MarketingPerformanceSnapshot> {
  const [shopOrders, googleAdsStatus, ga4Status, ga4Id, googleAdsTag, channelRows] =
    await Promise.all([
      loadShopOrders(),
      getGoogleAdsApiStatus(),
      getGa4ApiStatus(),
      getRuntimeSetting("NEXT_PUBLIC_GA4_ID"),
      getRuntimeSetting("NEXT_PUBLIC_GOOGLE_ADS_ID"),
      Promise.all(
        MARKETING_CHANNELS.map(async (ch) => {
          const insight = await getMarketingChannelInsight(ch.id);
          const env = await marketingChannelEnvStatusAsync(ch.envKeys);
          const roiBase = computeChannelRoi(insight);
          return {
            channel: ch.id,
            href: ch.href,
            shortLabel: ch.shortLabel,
            envConfigured: env.configured,
            adSpendRon: insight.adSpendRon,
            attributedRevenueRon: insight.attributedRevenueRon,
            roas: roiBase.roas,
            roi: roiBase.roi,
            campaignCount: insight.campaigns.length,
            updatedAt: insight.updatedAt,
            impressions: insight.impressions,
            clicks: insight.clicks,
            conversions: insight.conversions,
          };
        }),
      ),
    ]);

  const shopAgg = aggregateShopOrders(shopOrders, period);

  let adsSource: MarketingPerformanceSnapshot["ads"]["source"] = "none";
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let conversionValue = 0;
  let currencyCode: string | null = null;
  let dateRangeNote: string | null = null;
  let adsError: string | null = null;

  if (googleAdsStatus.configured) {
    try {
      const live = await fetchGoogleAdsPeriodMetrics(period);
      adsSource = "google_ads_api";
      spend = live.spend;
      impressions = live.impressions;
      clicks = live.clicks;
      conversions = live.conversions;
      conversionValue = live.conversionValue;
      currencyCode = live.currencyCode;
      if (period === "all") {
        dateRangeNote = "Google Ads API toont hier LAST_30_DAYS (niet ‘alles’).";
      } else {
        dateRangeNote = live.dateRangeLabel;
      }
    } catch (err) {
      adsError = err instanceof Error ? err.message : "Google Ads sync mislukt";
    }
  }

  if (adsSource === "none") {
    const paid = channelRows.filter((c) => c.channel !== "email");
    spend = round2(paid.reduce((sum, c) => sum + c.adSpendRon, 0));
    impressions = paid.reduce((sum, c) => sum + c.impressions, 0);
    clicks = paid.reduce((sum, c) => sum + c.clicks, 0);
    conversions = paid.reduce((sum, c) => sum + c.conversions, 0);
    conversionValue = round2(paid.reduce((sum, c) => sum + c.attributedRevenueRon, 0));
    if (spend > 0 || impressions > 0 || conversionValue > 0) {
      adsSource = "manual";
      dateRangeNote = "Handmatige kanaalcijfers (niet periode-gefilterd).";
    }
  }

  let ga4Source: MarketingPerformanceSnapshot["ga4"]["source"] = "none";
  let ga4Revenue = 0;
  let sessions = 0;
  let totalUsers = 0;
  let transactions = 0;
  let ga4Error: string | null = null;

  if (ga4Status.configured) {
    try {
      const live = await fetchGa4PeriodMetrics(period);
      ga4Source = "ga4_api";
      ga4Revenue = live.purchaseRevenue;
      sessions = live.sessions;
      totalUsers = live.totalUsers;
      transactions = live.transactions;
    } catch (err) {
      ga4Error = err instanceof Error ? err.message : "GA4 sync mislukt";
    }
  }

  const revenue = shopAgg.revenue;
  const roas = computeRoas(revenue, spend);
  const roi = computeRoi(revenue, spend);
  const profit = spend > 0 || revenue > 0 ? round2(revenue - spend) : null;
  const adsAttributedRoas = computeRoas(conversionValue, spend);

  return {
    period,
    periodLabel: getDashboardPeriodLabel(period),
    generatedAt: new Date().toISOString(),
    shop: {
      revenue: round2(shopAgg.revenue),
      ordersCount: shopAgg.ordersCount,
      activeOrdersCount: shopAgg.activeOrdersCount,
      avgOrder: round2(shopAgg.avgOrder),
    },
    ads: {
      source: adsSource,
      spend,
      impressions,
      clicks,
      conversions,
      conversionValue,
      currencyCode,
      dateRangeNote,
      error: adsError,
    },
    ga4: {
      source: ga4Source,
      purchaseRevenue: ga4Revenue,
      sessions,
      totalUsers,
      transactions,
      error: ga4Error,
    },
    roas,
    roi,
    profit,
    adsAttributedRoas,
    connections: {
      googleAdsTag: Boolean(googleAdsTag.trim()),
      googleAdsApi: googleAdsStatus.configured,
      googleAdsApiMissing: googleAdsStatus.missing,
      ga4Measurement: Boolean(ga4Id.trim()),
      ga4Api: ga4Status.configured,
      ga4ApiMissing: ga4Status.missing,
    },
    channels: channelRows,
  };
}
