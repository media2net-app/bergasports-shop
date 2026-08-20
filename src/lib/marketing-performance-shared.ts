import type { DashboardPeriod } from "@/lib/dashboard-period";
import type { MarketingChannelSummary } from "@/lib/marketing-channel-insights-shared";

export type MarketingPerformanceSnapshot = {
  period: DashboardPeriod;
  periodLabel: string;
  generatedAt: string;
  shop: {
    revenue: number;
    ordersCount: number;
    activeOrdersCount: number;
    avgOrder: number;
  };
  ads: {
    source: "google_ads_api" | "manual" | "none";
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
    currencyCode: string | null;
    dateRangeNote: string | null;
    error: string | null;
  };
  ga4: {
    source: "ga4_api" | "none";
    purchaseRevenue: number;
    sessions: number;
    totalUsers: number;
    transactions: number;
    error: string | null;
  };
  /** Primary: shop revenue / ads spend */
  roas: number | null;
  /** (revenue − spend) / spend as ratio, e.g. 1.5 = 150% */
  roi: number | null;
  profit: number | null;
  /** Secondary: Ads conversion value / spend when available */
  adsAttributedRoas: number | null;
  connections: {
    googleAdsTag: boolean;
    googleAdsApi: boolean;
    googleAdsApiMissing: string[];
    ga4Measurement: boolean;
    ga4Api: boolean;
    ga4ApiMissing: string[];
  };
  channels: Array<
    MarketingChannelSummary & {
      impressions: number;
      clicks: number;
      conversions: number;
      roi: number | null;
    }
  >;
};
