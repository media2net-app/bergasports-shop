import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { getPrisma } from "@/lib/prisma";
import type { PageSpeedReport, PageSpeedStrategy } from "@/lib/pagespeed-types";

export type PageSpeedHistoryRow = {
  id: string;
  strategy: PageSpeedStrategy;
  url: string;
  fetchedAt: string;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
};

const HISTORY_LIMIT = 20;

function rowToReport(reportJson: Prisma.JsonValue): PageSpeedReport | null {
  if (!reportJson || typeof reportJson !== "object") {
    return null;
  }
  return reportJson as PageSpeedReport;
}

export async function savePageSpeedReport(report: PageSpeedReport): Promise<string | null> {
  const prisma = getPrisma();
  if (!prisma) {
    return null;
  }

  try {
    const data = await prisma.pagespeedReport.create({
      data: {
        strategy: report.strategy,
        url: report.url,
        analyzedUrl: report.analyzedUrl,
        fetchedAt: new Date(report.fetchedAt),
        performanceScore: report.categories.performance,
        accessibilityScore: report.categories.accessibility,
        bestPracticesScore: report.categories.bestPractices,
        seoScore: report.categories.seo,
        reportJson: report as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return data.id;
  } catch (e) {
    console.error("[pagespeed-db] save", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getLatestPageSpeedReports(): Promise<{
  mobile: PageSpeedReport | null;
  desktop: PageSpeedReport | null;
}> {
  const prisma = getPrisma();
  if (!prisma) {
    return { mobile: null, desktop: null };
  }

  const [mobile, desktop] = await Promise.all(
    (["mobile", "desktop"] as const).map((strategy) =>
      prisma.pagespeedReport.findFirst({
        where: { strategy },
        orderBy: { createdAt: "desc" },
        select: { reportJson: true },
      }),
    ),
  );

  return {
    mobile: mobile ? rowToReport(mobile.reportJson) : null,
    desktop: desktop ? rowToReport(desktop.reportJson) : null,
  };
}

export async function getLatestPageSpeedReportForUrl(
  strategy: PageSpeedStrategy,
  url: string,
): Promise<PageSpeedReport | null> {
  const prisma = getPrisma();
  if (!prisma) {
    return null;
  }
  const normalized = url.replace(/\/$/, "");
  const row = await prisma.pagespeedReport.findFirst({
    where: { strategy, url: normalized },
    orderBy: { createdAt: "desc" },
    select: { reportJson: true },
  });
  return row ? rowToReport(row.reportJson) : null;
}

export async function getPreviousPageSpeedReports(): Promise<{
  mobile: PageSpeedReport | null;
  desktop: PageSpeedReport | null;
}> {
  const prisma = getPrisma();
  if (!prisma) {
    return { mobile: null, desktop: null };
  }
  const db = prisma;

  async function previous(strategy: PageSpeedStrategy): Promise<PageSpeedReport | null> {
    const rows = await db.pagespeedReport.findMany({
      where: { strategy },
      orderBy: { createdAt: "desc" },
      skip: 1,
      take: 1,
      select: { reportJson: true },
    });
    return rows[0] ? rowToReport(rows[0].reportJson) : null;
  }

  const [mobile, desktop] = await Promise.all([previous("mobile"), previous("desktop")]);
  return { mobile, desktop };
}

export async function listPageSpeedHistory(limit = HISTORY_LIMIT): Promise<PageSpeedHistoryRow[]> {
  const prisma = getPrisma();
  if (!prisma) {
    return [];
  }

  try {
    const rows = await prisma.pagespeedReport.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        strategy: true,
        url: true,
        fetchedAt: true,
        performanceScore: true,
        accessibilityScore: true,
        bestPracticesScore: true,
        seoScore: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      strategy: row.strategy as PageSpeedStrategy,
      url: row.url,
      fetchedAt: row.fetchedAt.toISOString(),
      performance: row.performanceScore,
      accessibility: row.accessibilityScore,
      bestPractices: row.bestPracticesScore,
      seo: row.seoScore,
    }));
  } catch (e) {
    console.error("[pagespeed-db] list", e instanceof Error ? e.message : e);
    return [];
  }
}
