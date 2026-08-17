import "server-only";

import { getMarketingStackStatus } from "@/lib/marketing-stack-status";
import { getLastWinbackCronRun, type WinbackCronLastRun } from "@/lib/marketing-winback-cron";
import { listWinBackCandidates } from "@/lib/marketing-email";
import { getOrderSlaSummary } from "@/lib/order-sla";
import { getTikTokCatalogHealth } from "@/lib/tiktok-catalog-health";
import {
  getMarketingChannelSummaries,
  type MarketingChannelSummary,
} from "@/lib/marketing-channel-insights";
import { requirePrisma } from "@/lib/database";

export type MarketingEmailCounts = {
  welcome: number;
  postPurchase: number;
  winBack: number;
  logAvailable: boolean;
};

async function getMarketingEmailCounts(): Promise<MarketingEmailCounts> {
  const prisma = requirePrisma();
  const [welcome, postPurchase, winBack] = await Promise.all([
    prisma.marketingEmailLog.count({ where: { kind: "welcome" } }),
    prisma.marketingEmailLog.count({ where: { kind: "post_purchase" } }),
    prisma.marketingEmailLog.count({ where: { kind: "win_back" } }),
  ]);
  return { welcome, postPurchase, winBack, logAvailable: true };
}

export type MarketingDashboardMetrics = {
  stack: Awaited<ReturnType<typeof getMarketingStackStatus>>;
  tiktok: Awaited<ReturnType<typeof getTikTokCatalogHealth>>;
  sla: Awaited<ReturnType<typeof getOrderSlaSummary>>;
  emailCounts: MarketingEmailCounts;
  winBackCandidates: number;
  paidChannelsReady: number;
  paidChannelsTotal: number;
  catalogImagePercent: number;
  catalogStockPercent: number;
  flowsActive: number;
  flowsTotal: number;
  cron: {
    secretConfigured: boolean;
    lastRun: WinbackCronLastRun | null;
    cronLogAvailable: boolean;
  };
  channelSummaries: MarketingChannelSummary[];
};

export async function getMarketingDashboardMetrics(): Promise<MarketingDashboardMetrics> {
  const [stack, tiktok, sla, emailCounts, winBackCandidates, cronHistory, channelSummaries] =
    await Promise.all([
      getMarketingStackStatus(),
      getTikTokCatalogHealth(),
      getOrderSlaSummary(24),
      getMarketingEmailCounts(),
      listWinBackCandidates(60, 100).then((rows) => rows.length),
      getLastWinbackCronRun(),
      getMarketingChannelSummaries(),
    ]);

  const paidFlags = [
    tiktok.pixel.pixelConfigured,
    stack.metaPixelId,
    stack.googleAdsId,
    stack.googleMerchantCenter,
  ];
  const paidChannelsReady = paidFlags.filter(Boolean).length;
  const visible = tiktok.productsVisible || 0;
  const catalogImagePercent = visible
    ? Math.round((tiktok.productsWithImage / visible) * 100)
    : 0;
  const catalogStockPercent = visible
    ? Math.round((tiktok.productsInStock / visible) * 100)
    : 0;

  const flowsActive =
    (stack.emailConfigured ? 1 : 0) +
    (tiktok.pixel.pixelConfigured ? 1 : 0) +
    (paidChannelsReady > 0 ? 1 : 0) +
    1; // repeat discount always on in code

  return {
    stack,
    tiktok,
    sla,
    emailCounts,
    winBackCandidates,
    paidChannelsReady,
    paidChannelsTotal: paidFlags.length,
    catalogImagePercent,
    catalogStockPercent,
    flowsActive,
    flowsTotal: 4,
    cron: {
      secretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      lastRun: cronHistory.lastRun,
      cronLogAvailable: cronHistory.logAvailable,
    },
    channelSummaries,
  };
}
