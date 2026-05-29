import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { resolveVisitorCoords } from "@/lib/analytics-geo";
import { ANALYTICS_ACTIVE_MS } from "@/lib/analytics-db";
import type { AnalyticsLiveSnapshot, LiveVisitorMarker } from "@/lib/analytics-live-types";
import { requirePrisma } from "@/lib/database";
import {
  getDashboardPeriodLabel,
  getDashboardPeriodRange,
  parseStoredDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard-period";
import { bigIntToNumber, productIdToBigInt } from "@/lib/prisma-mappers";

export type { AnalyticsLiveSnapshot, LiveVisitorMarker } from "@/lib/analytics-live-types";

function periodWhere(
  field: "firstSeenAt" | "viewedAt" | "createdAt",
  periodStart: Date | null,
  periodEnd: Date | null,
): Prisma.AnalyticsSessionWhereInput | Prisma.AnalyticsPageViewWhereInput | Prisma.OrderWhereInput {
  const range: { gte?: Date; lt?: Date } = {};
  if (periodStart) {
    range.gte = periodStart;
  }
  if (periodEnd) {
    range.lt = periodEnd;
  }
  if (!periodStart && !periodEnd) {
    return {};
  }
  return { [field]: range } as Prisma.AnalyticsSessionWhereInput;
}

function startOf10MinAgo(): Date {
  return new Date(Date.now() - 10 * 60 * 1000);
}

export async function getAnalyticsLiveSnapshot(
  periodInput?: DashboardPeriod | string | null,
): Promise<AnalyticsLiveSnapshot> {
  const prisma = requirePrisma();
  const period =
    typeof periodInput === "string"
      ? parseStoredDashboardPeriod(periodInput)
      : (periodInput ?? "all");
  const { start: periodStart, end: periodEnd } = getDashboardPeriodRange(period);
  const periodLabel = getDashboardPeriodLabel(period);

  const now = Date.now();
  const activeSince = new Date(now - ANALYTICS_ACTIVE_MS);

  const sessionPeriodWhere = periodWhere("firstSeenAt", periodStart, periodEnd) as Prisma.AnalyticsSessionWhereInput;
  const viewPeriodWhere = periodWhere("viewedAt", periodStart, periodEnd) as Prisma.AnalyticsPageViewWhereInput;
  const orderPeriodWhere = periodWhere("createdAt", periodStart, periodEnd) as Prisma.OrderWhereInput;

  const [
    activeRows,
    sessions,
    pageViews,
    orders,
    pageViewsForPaths,
    pageViewsForProducts,
    recentViews,
  ] = await Promise.all([
    prisma.analyticsSession.findMany({
      where: { lastSeenAt: { gte: activeSince } },
      select: {
        sessionId: true,
        countryCode: true,
        city: true,
        latitude: true,
        longitude: true,
        currentPath: true,
        currentProductId: true,
        cartItemsCount: true,
        checkoutActive: true,
        lastSeenAt: true,
      },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
    }),
    prisma.analyticsSession.count({ where: sessionPeriodWhere }),
    prisma.analyticsPageView.count({ where: viewPeriodWhere }),
    prisma.order.count({
      where: { ...orderPeriodWhere, status: { not: "cancelled" } },
    }),
    prisma.analyticsPageView.findMany({
      where: viewPeriodWhere,
      select: { path: true },
      take: 5000,
    }),
    prisma.analyticsPageView.findMany({
      where: { ...viewPeriodWhere, productId: { not: null } },
      select: { productId: true },
      take: 5000,
    }),
    prisma.analyticsPageView.findMany({
      where: { viewedAt: { gte: startOf10MinAgo() } },
      select: { viewedAt: true },
      orderBy: { viewedAt: "asc" },
    }),
  ]);

  let activeCartsNow = 0;
  let checkoutNow = 0;
  for (const row of activeRows) {
    if (row.cartItemsCount > 0) {
      activeCartsNow += 1;
    }
    if (row.checkoutActive) {
      checkoutNow += 1;
    }
  }

  const conversionRate = sessions > 0 ? Math.round((orders / sessions) * 1000) / 10 : null;

  const visitors: LiveVisitorMarker[] = [];
  for (const row of activeRows) {
    const coords = resolveVisitorCoords({
      latitude: row.latitude,
      longitude: row.longitude,
      countryCode: row.countryCode,
      sessionId: row.sessionId,
    });
    if (!coords) {
      continue;
    }
    visitors.push({
      sessionId: row.sessionId,
      lat: coords[0],
      lng: coords[1],
      city: row.city,
      countryCode: row.countryCode,
      path: row.currentPath ?? "/",
      productId: row.currentProductId != null ? bigIntToNumber(row.currentProductId) : null,
      lastSeenAt: row.lastSeenAt.toISOString(),
    });
  }

  const pathCounts = new Map<string, number>();
  for (const row of pageViewsForPaths) {
    pathCounts.set(row.path, (pathCounts.get(row.path) ?? 0) + 1);
  }
  const topPages = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, views]) => ({ path, views }));

  const productCounts = new Map<number, number>();
  for (const row of pageViewsForProducts) {
    if (row.productId == null) {
      continue;
    }
    const id = bigIntToNumber(row.productId);
    productCounts.set(id, (productCounts.get(id) ?? 0) + 1);
  }
  const topProductIds = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const productNames = new Map<number, string>();
  if (topProductIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: topProductIds.map(([id]) => productIdToBigInt(id)) } },
      select: { id: true, data: true },
    });
    for (const p of products) {
      const payload = p.data as { name?: string } | null;
      const name = payload?.name?.trim();
      if (name) {
        productNames.set(bigIntToNumber(p.id), name);
      }
    }
  }

  const topProducts = topProductIds.map(([productId, views]) => ({
    productId,
    views,
    name: productNames.get(productId) ?? null,
  }));

  const buckets = new Map<string, number>();
  for (let i = 9; i >= 0; i--) {
    const t = new Date(now - i * 60 * 1000);
    const key = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
    buckets.set(key, 0);
  }
  for (const row of recentViews) {
    const d = row.viewedAt;
    const key = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  const pageViewsLast10Min = [...buckets.entries()].map(([minute, views]) => ({ minute, views }));

  return {
    generatedAt: new Date().toISOString(),
    period,
    periodLabel,
    visitorsNow: activeRows.length,
    activeCartsNow,
    checkoutNow,
    sessions,
    pageViews,
    orders,
    conversionRate,
    visitors,
    topPages,
    topProducts,
    pageViewsLast10Min,
  };
}
