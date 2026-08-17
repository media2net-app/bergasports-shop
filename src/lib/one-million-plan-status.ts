import "server-only";

import type { OneMillionPlanSignals } from "@/lib/one-million-plan";
import { getEasySalesConfig } from "@/lib/easy-sales";
import { isOutboundEmailConfigured } from "@/lib/outbound-email";
import { getOrderSlaSummary } from "@/lib/order-sla";
import { getLatestPageSpeedReportForUrl } from "@/lib/pagespeed-db";
import { shopPageSpeedUrl } from "@/lib/pagespeed";
import type { PageSpeedReport } from "@/lib/pagespeed-types";
import { requirePrisma } from "@/lib/database";
import { isHostedProductImageUrl } from "@/lib/product-image-storage";

export type { OneMillionPlanSignals };

const LEGAL_PAGE_SLUGS = ["terms", "privacy", "shipping", "cookies"] as const;
const MIN_LEGAL_BODY_LENGTH = 400;
const PRODUCT_IMAGES_BUCKET = "product-images";
const DESCRIPTION_IMG_ATTR_RES = [
  /\bsrc\s*=\s*["']([^"']+)["']/gi,
  /\bdata-src\s*=\s*["']([^"']+)["']/gi,
  /\bdata-lazy-src\s*=\s*["']([^"']+)["']/gi,
];

function collectProductImageUrls(data: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const image = data.image;
  if (typeof image === "string" && image.trim()) urls.push(image.trim());
  const images = data.images;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === "string" && img.trim()) urls.push(img.trim());
    }
  }
  const variations = data.wcVariations;
  if (Array.isArray(variations)) {
    for (const v of variations) {
      if (v && typeof v === "object" && "image" in v) {
        const img = (v as { image?: string }).image;
        if (typeof img === "string" && img.trim()) urls.push(img.trim());
      }
    }
  }
  return urls;
}

function normalizeDescriptionImageUrl(url: string): string {
  const t = url.trim();
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("http://")) return `https://${t.slice(7)}`;
  return t;
}

function collectDescriptionImageUrls(data: Record<string, unknown>): string[] {
  const urls: string[] = [];
  for (const key of ["wcShortDescriptionHtml", "wcDescriptionHtml"] as const) {
    const html = data[key];
    if (typeof html !== "string" || !html.trim()) {
      continue;
    }
    const tagRe = /<img\b[^>]*>/gi;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRe.exec(html)) !== null) {
      const tag = tagMatch[0];
      for (const re of DESCRIPTION_IMG_ATTR_RES) {
        re.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = re.exec(tag)) !== null) {
          const src = match[1]?.trim();
          if (src) {
            urls.push(normalizeDescriptionImageUrl(src));
          }
        }
      }
    }
  }
  return urls;
}

function hasExternalHttpImage(urls: string[]): boolean {
  return urls.some((u) => /^https:\/\//i.test(u) && !isHostedProductImageUrl(u));
}

async function countProductHostingSignals(): Promise<{
  fullyHosted: number;
  withExternal: number;
  withExternalDescriptionImages: number;
}> {
  let fullyHosted = 0;
  let withExternal = 0;
  let withExternalDescriptionImages = 0;
  const prisma = requirePrisma();
  let skip = 0;
  const pageSize = 1000;

  while (true) {
    const batch = await prisma.product.findMany({
      select: { data: true },
      orderBy: { id: "asc" },
      skip,
      take: pageSize,
    });
    if (!batch.length) {
      break;
    }
    for (const row of batch) {
      const product = (row.data ?? {}) as Record<string, unknown>;
      const urls = collectProductImageUrls(product);
      if (urls.length) {
        const hasExternal = hasExternalHttpImage(urls);
        if (hasExternal) {
          withExternal += 1;
        } else if (urls.every((u) => isHostedProductImageUrl(u))) {
          fullyHosted += 1;
        }
      }

      const descUrls = collectDescriptionImageUrls(product);
      if (descUrls.length && hasExternalHttpImage(descUrls)) {
        withExternalDescriptionImages += 1;
      }
    }
    if (batch.length < pageSize) {
      break;
    }
    skip += pageSize;
  }

  return { fullyHosted, withExternal, withExternalDescriptionImages };
}

async function countProductsWithEasySalesMapping(): Promise<number> {
  const prisma = requirePrisma();
  let count = 0;
  let skip = 0;
  const pageSize = 500;

  while (true) {
    const batch = await prisma.product.findMany({
      select: { data: true },
      orderBy: { id: "asc" },
      skip,
      take: pageSize,
    });
    if (!batch.length) {
      break;
    }
    for (const row of batch) {
      const d = row.data as Record<string, unknown> | null;
      if (d && typeof d.easySalesProductId === "number" && d.easySalesProductId > 0) {
        count++;
      }
    }
    if (batch.length < pageSize) {
      break;
    }
    skip += pageSize;
  }

  return count;
}

function isMobileCwvGood(report: PageSpeedReport | null): boolean {
  if (!report) {
    return false;
  }
  const perf = report.categories.performance;
  const lcpMs = report.coreWebVitals.lcp?.numericValue;
  const cls = report.coreWebVitals.cls?.numericValue;
  if (perf == null || perf < 80) {
    return false;
  }
  if (lcpMs != null && lcpMs > 2500) {
    return false;
  }
  if (cls != null && cls > 0.1) {
    return false;
  }
  return true;
}

export async function getOneMillionPlanSignals(): Promise<OneMillionPlanSignals | null> {
  const prisma = requirePrisma();

  const [productsTotal, mirroredImageAssets, categoriesTotal, externalCategories, legalRows] =
    await Promise.all([
      prisma.product.count(),
      prisma.productImageAsset.count(),
      prisma.category.count(),
      prisma.category.count({
        where: {
          OR: [
            { link: { contains: "ralexpucioasa.ro", mode: "insensitive" } },
            {
              AND: [
                { link: { contains: "://" } },
                { NOT: { link: { startsWith: "/" } } },
              ],
            },
          ],
        },
      }),
      prisma.sitePage.findMany({
        where: { slug: { in: [...LEGAL_PAGE_SLUGS] }, isPublished: true },
        select: { slug: true, bodyHtml: true },
      }),
    ]);

  const hosting = await countProductHostingSignals();
  const legalPagesReady =
    LEGAL_PAGE_SLUGS.every((slug) =>
      legalRows.some(
        (row) =>
          row.slug === slug &&
          typeof row.bodyHtml === "string" &&
          row.bodyHtml.length >= MIN_LEGAL_BODY_LENGTH,
      ),
    );

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const siteRoot = shopPageSpeedUrl();
  const shopUrl = `${siteRoot}/shop`;

  const [mobileHome, mobileShop, analyticsSessionsLast7d, productsWithEasySalesMapping, orderSla] =
    await Promise.all([
      getLatestPageSpeedReportForUrl("mobile", siteRoot),
      getLatestPageSpeedReportForUrl("mobile", shopUrl),
      prisma.analyticsSession.count({ where: { firstSeenAt: { gte: since7d } } }),
      countProductsWithEasySalesMapping(),
      getOrderSlaSummary(24),
    ]);

  const homeOk = isMobileCwvGood(mobileHome);
  const shopOk = isMobileCwvGood(mobileShop);
  const cwvMobileReady = homeOk || shopOk;
  const mobileReport = homeOk ? mobileHome : shopOk ? mobileShop : mobileHome ?? mobileShop;

  return {
    productsTotal,
    mirroredImageAssets,
    productsFullyHosted: hosting.fullyHosted,
    productsWithExternalImages: hosting.withExternal,
    productsWithExternalDescriptionImages: hosting.withExternalDescriptionImages,
    categoriesTotal,
    categoriesExternalLink: externalCategories,
    legalPagesReady,
    cwvMobileReady,
    cwvMobilePerformance: mobileReport?.categories.performance ?? null,
    cwvMobileLcpMs: mobileReport?.coreWebVitals.lcp?.numericValue ?? null,
    cwvMobileLcpDisplay: mobileReport?.coreWebVitals.lcp?.displayValue ?? null,
    cwvMobileCls: mobileReport?.coreWebVitals.cls?.numericValue ?? null,
    cwvMobileTestUrl: mobileReport?.url ?? null,
    cwvMobileHomeLcpDisplay:
      cwvMobileReady && !homeOk && mobileHome
        ? (mobileHome.coreWebVitals.lcp?.displayValue ?? null)
        : null,
    analyticsSessionsLast7d,
    productsWithEasySalesMapping,
    easySalesConfigured: Boolean(await getEasySalesConfig()),
    ordersPendingSlaBreach: orderSla.pendingOlderThan24h,
    marketingEmailConfigured: await isOutboundEmailConfigured(),
  };
}
