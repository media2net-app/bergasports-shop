import type { MarketingChannelId } from "@/lib/marketing-channels";

export type MarketingCampaignRow = {
  id: string;
  name: string;
  status: "active" | "paused" | "ended";
  budgetRon: number;
  spendRon: number;
  impressions: number;
  clicks: number;
  conversions: number;
  notes: string;
};

export type MarketingChannelInsightRow = {
  channel: MarketingChannelId;
  adSpendRon: number;
  attributedRevenueRon: number;
  impressions: number;
  clicks: number;
  conversions: number;
  campaigns: MarketingCampaignRow[];
  notes: string | null;
  updatedAt: string | null;
};

export type MarketingChannelShopContext = {
  revenueRon30d: number;
  orders30d: number;
  aovRon: number;
};

export type MarketingEmailChannelStats = {
  welcomeSent: number;
  postPurchaseSent: number;
  winBackSent: number;
  ordersWithConsent30d: number;
  consentRatePercent: number;
};

export type MarketingChannelSummary = {
  channel: MarketingChannelId;
  href: string;
  shortLabel: string;
  envConfigured: boolean;
  adSpendRon: number;
  attributedRevenueRon: number;
  roas: number | null;
  campaignCount: number;
  updatedAt: string | null;
};

export function computeChannelRoi(insight: MarketingChannelInsightRow): {
  roas: number | null;
  cpaRon: number | null;
  profitRon: number;
} {
  const spend = insight.adSpendRon;
  const revenue = insight.attributedRevenueRon;
  const profitRon = Math.round((revenue - spend) * 100) / 100;
  return {
    roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null,
    cpaRon:
      insight.conversions > 0 && spend > 0
        ? Math.round((spend / insight.conversions) * 100) / 100
        : null,
    profitRon,
  };
}
