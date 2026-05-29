import "server-only";

import { requirePrisma } from "@/lib/database";
import type { RequestGeo } from "@/lib/analytics-geo";
import { productIdToBigInt } from "@/lib/prisma-mappers";

export const ANALYTICS_ACTIVE_MS = 2 * 60 * 1000;

export type AnalyticsPingInput = {
  visitorId: string;
  sessionId: string;
  path: string;
  productId: number | null;
  referrer: string | null;
  userAgent: string | null;
  geo: RequestGeo;
  cartItemsCount?: number;
  cartOpen?: boolean;
  checkoutActive?: boolean;
};

export async function recordAnalyticsPing(input: AnalyticsPingInput): Promise<void> {
  const prisma = requirePrisma();
  const now = new Date();

  const existing = await prisma.analyticsSession.findUnique({
    where: { sessionId: input.sessionId },
    select: { currentPath: true },
  });

  const pathChanged = !existing || existing.currentPath !== input.path;
  const cartItemsCount = Math.max(0, Math.min(999, Math.floor(Number(input.cartItemsCount) || 0)));

  const sessionData = {
    visitorId: input.visitorId,
    countryCode: input.geo.countryCode,
    city: input.geo.city,
    region: input.geo.region,
    latitude: input.geo.latitude,
    longitude: input.geo.longitude,
    userAgent: input.userAgent,
    referrer: input.referrer,
    currentPath: input.path,
    currentProductId: input.productId != null ? productIdToBigInt(input.productId) : null,
    cartItemsCount,
    cartOpen: Boolean(input.cartOpen),
    checkoutActive: Boolean(input.checkoutActive),
    lastSeenAt: now,
  };

  if (existing) {
    await prisma.analyticsSession.update({
      where: { sessionId: input.sessionId },
      data: sessionData,
    });
  } else {
    await prisma.analyticsSession.create({
      data: {
        sessionId: input.sessionId,
        firstSeenAt: now,
        ...sessionData,
      },
    });
  }

  if (pathChanged) {
    await prisma.analyticsPageView.create({
      data: {
        sessionId: input.sessionId,
        path: input.path,
        productId: input.productId != null ? productIdToBigInt(input.productId) : null,
        viewedAt: now,
      },
    });
  }
}

export function productIdFromPath(path: string): number | null {
  const m = path.match(/^\/product\/(\d+)(?:\/|$|\?)/);
  if (!m) {
    return null;
  }
  const id = Number.parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}
