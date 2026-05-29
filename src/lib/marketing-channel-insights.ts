import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { requirePrisma } from "@/lib/database";
import {
  MARKETING_CHANNELS,
  marketingChannelEnvStatus,
  type MarketingChannelId,
} from "@/lib/marketing-channels";
import {
  computeChannelRoi,
  type MarketingCampaignRow,
  type MarketingChannelInsightRow,
  type MarketingChannelShopContext,
  type MarketingChannelSummary,
  type MarketingEmailChannelStats,
} from "@/lib/marketing-channel-insights-shared";
import { decimalToNumber } from "@/lib/prisma-mappers";

export type {
  MarketingCampaignRow,
  MarketingChannelInsightRow,
  MarketingChannelShopContext,
  MarketingChannelSummary,
  MarketingEmailChannelStats,
} from "@/lib/marketing-channel-insights-shared";

export { computeChannelRoi } from "@/lib/marketing-channel-insights-shared";

function defaultInsight(channel: MarketingChannelId): MarketingChannelInsightRow {
  return {
    channel,
    adSpendRon: 0,
    attributedRevenueRon: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    campaigns: [],
    notes: null,
    updatedAt: null,
  };
}

function parseCampaigns(raw: unknown): MarketingCampaignRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const o = item as Record<string, unknown>;
      const status = o.status;
      const validStatus: MarketingCampaignRow["status"] =
        status === "active" || status === "paused" || status === "ended" ? status : "active";
      return {
        id: String(o.id ?? `c-${index}`),
        name: String(o.name ?? "Campaign"),
        status: validStatus,
        budgetRon: Number(o.budgetRon ?? 0) || 0,
        spendRon: Number(o.spendRon ?? 0) || 0,
        impressions: Number(o.impressions ?? 0) || 0,
        clicks: Number(o.clicks ?? 0) || 0,
        conversions: Number(o.conversions ?? 0) || 0,
        notes: String(o.notes ?? ""),
      };
    })
    .filter((row): row is MarketingCampaignRow => row != null);
}

export async function getMarketingChannelInsight(
  channel: MarketingChannelId,
): Promise<MarketingChannelInsightRow> {
  const prisma = requirePrisma();
  const data = await prisma.marketingChannelInsight.findUnique({ where: { channel } });
  if (!data) {
    return defaultInsight(channel);
  }

  return {
    channel,
    adSpendRon: decimalToNumber(data.adSpendRon) ?? 0,
    attributedRevenueRon: decimalToNumber(data.attributedRevenueRon) ?? 0,
    impressions: Number(data.impressions) || 0,
    clicks: Number(data.clicks) || 0,
    conversions: data.conversions,
    campaigns: parseCampaigns(data.campaigns),
    notes: data.notes,
    updatedAt: data.updatedAt.toISOString(),
  };
}

export async function saveMarketingChannelInsight(
  channel: MarketingChannelId,
  input: Omit<MarketingChannelInsightRow, "channel" | "updatedAt">,
): Promise<void> {
  const prisma = requirePrisma();
  await prisma.marketingChannelInsight.upsert({
    where: { channel },
    create: {
      channel,
      adSpendRon: input.adSpendRon,
      attributedRevenueRon: input.attributedRevenueRon,
      impressions: BigInt(input.impressions),
      clicks: BigInt(input.clicks),
      conversions: input.conversions,
      campaigns: input.campaigns as unknown as Prisma.InputJsonValue,
      notes: input.notes?.trim() || null,
    },
    update: {
      adSpendRon: input.adSpendRon,
      attributedRevenueRon: input.attributedRevenueRon,
      impressions: BigInt(input.impressions),
      clicks: BigInt(input.clicks),
      conversions: input.conversions,
      campaigns: input.campaigns as unknown as Prisma.InputJsonValue,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function getShopContext30d(): Promise<MarketingChannelShopContext> {
  const prisma = requirePrisma();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: "cancelled" } },
    select: { total: true },
  });

  let revenue = 0;
  for (const row of rows) {
    revenue += decimalToNumber(row.total) ?? 0;
  }
  const orders30d = rows.length;
  return {
    revenueRon30d: Math.round(revenue * 100) / 100,
    orders30d,
    aovRon: orders30d > 0 ? Math.round((revenue / orders30d) * 100) / 100 : 0,
  };
}

export async function getEmailChannelStats(): Promise<MarketingEmailChannelStats> {
  const prisma = requirePrisma();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [welcome, postPurchase, winBack, orders] = await Promise.all([
    prisma.marketingEmailLog.count({ where: { kind: "welcome" } }),
    prisma.marketingEmailLog.count({ where: { kind: "post_purchase" } }),
    prisma.marketingEmailLog.count({ where: { kind: "win_back" } }),
    prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: "cancelled" } },
      select: { marketingConsent: true },
    }),
  ]);

  const withConsent = orders.filter((o) => o.marketingConsent).length;
  const total = orders.length;

  return {
    welcomeSent: welcome,
    postPurchaseSent: postPurchase,
    winBackSent: winBack,
    ordersWithConsent30d: withConsent,
    consentRatePercent: total > 0 ? Math.round((withConsent / total) * 100) : 0,
  };
}

export async function getMarketingChannelSummaries(): Promise<MarketingChannelSummary[]> {
  return Promise.all(
    MARKETING_CHANNELS.map(async (ch) => {
      const insight = await getMarketingChannelInsight(ch.id);
      const env = marketingChannelEnvStatus(ch.envKeys);
      const roi = computeChannelRoi(insight);
      return {
        channel: ch.id,
        href: ch.href,
        shortLabel: ch.shortLabel,
        envConfigured: env.configured,
        adSpendRon: insight.adSpendRon,
        attributedRevenueRon: insight.attributedRevenueRon,
        roas: roi.roas,
        campaignCount: insight.campaigns.length,
        updatedAt: insight.updatedAt,
      };
    }),
  );
}
