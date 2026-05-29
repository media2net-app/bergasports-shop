import "server-only";

import type {
  PageSpeedAuditMetric,
  PageSpeedOpportunity,
  PageSpeedReport,
  PageSpeedStrategy,
} from "@/lib/pagespeed-types";

type LighthouseAudit = {
  id?: string;
  title?: string;
  description?: string;
  displayValue?: string;
  numericValue?: number;
  score?: number | null;
  details?: { type?: string };
};

type LighthouseResult = {
  finalUrl?: string;
  fetchTime?: string;
  categories?: Record<
    string,
    {
      score?: number | null;
    }
  >;
  audits?: Record<string, LighthouseAudit>;
};

type PageSpeedApiResponse = {
  id?: string;
  lighthouseResult?: LighthouseResult;
  error?: { message?: string };
};

export function shopPageSpeedUrl(): string {
  const custom = process.env.PAGESPEED_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (custom) {
    return custom.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, "");
}

export function pageSpeedApiKeyConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PAGESPEED_API_KEY?.trim());
}

function categoryScore(lhr: LighthouseResult, id: string): number | null {
  const raw = lhr.categories?.[id]?.score;
  if (raw == null || !Number.isFinite(raw)) {
    return null;
  }
  return Math.round(raw * 100);
}

function auditMetric(lhr: LighthouseResult, id: string): PageSpeedAuditMetric | null {
  const a = lhr.audits?.[id];
  if (!a) {
    return null;
  }
  return {
    id,
    title: a.title ?? id,
    displayValue: a.displayValue ?? null,
    numericValue: typeof a.numericValue === "number" ? a.numericValue : null,
    score: a.score ?? null,
  };
}

function collectOpportunities(lhr: LighthouseResult, limit = 6): PageSpeedOpportunity[] {
  const audits = lhr.audits ?? {};
  const rows: PageSpeedOpportunity[] = [];

  for (const [id, audit] of Object.entries(audits)) {
    if (audit.details?.type !== "opportunity") {
      continue;
    }
    if (audit.score == null || audit.score >= 0.99) {
      continue;
    }
    rows.push({
      id,
      title: audit.title ?? id,
      displayValue: audit.displayValue ?? null,
      description: audit.description ?? "",
    });
  }

  rows.sort((a, b) => {
    const sa = audits[a.id]?.score ?? 1;
    const sb = audits[b.id]?.score ?? 1;
    return sa - sb;
  });

  return rows.slice(0, limit);
}

function reportLink(url: string, strategy: PageSpeedStrategy): string {
  const encoded = encodeURIComponent(url);
  return `https://pagespeed.web.dev/analysis?url=${encoded}&form_factor=${strategy}`;
}

export async function runPageSpeedInsights(
  strategy: PageSpeedStrategy,
  url?: string,
): Promise<PageSpeedReport> {
  const targetUrl = (url?.trim() || shopPageSpeedUrl()).replace(/\/$/, "");
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();

  const params = new URLSearchParams({
    url: targetUrl,
    strategy,
    category: "performance",
  });
  params.append("category", "accessibility");
  params.append("category", "best-practices");
  params.append("category", "seo");

  if (apiKey) {
    params.set("key", apiKey);
  }

  const endpoint = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("PageSpeed test timed out after 90 seconds. Try again.");
    }
    throw new Error("Could not reach Google PageSpeed Insights.");
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await res.json()) as PageSpeedApiResponse;

  if (!res.ok) {
    const googleMsg = payload.error?.message?.trim();
    let msg = googleMsg;
    if (!msg) {
      if (res.status === 429) {
        msg = apiKey
          ? "PageSpeed API daily quota exceeded for this API key. Check quotas in Google Cloud Console (PageSpeed Insights API), or wait until tomorrow."
          : "PageSpeed API quota exceeded. Set GOOGLE_PAGESPEED_API_KEY on Vercel Production (it works in .env.local but was missing on the server).";
      } else {
        msg = `PageSpeed API error (${res.status})`;
      }
    } else if (!apiKey && /quota|limit|429/i.test(msg)) {
      msg = `${msg} — GOOGLE_PAGESPEED_API_KEY is not set on this server (add it in Vercel → Project → Environment Variables → Production).`;
    }
    throw new Error(msg);
  }

  const lhr = payload.lighthouseResult;
  if (!lhr) {
    throw new Error("PageSpeed returned no Lighthouse data.");
  }

  return {
    strategy,
    url: targetUrl,
    analyzedUrl: lhr.finalUrl ?? targetUrl,
    fetchedAt: lhr.fetchTime ?? new Date().toISOString(),
    categories: {
      performance: categoryScore(lhr, "performance"),
      accessibility: categoryScore(lhr, "accessibility"),
      bestPractices: categoryScore(lhr, "best-practices"),
      seo: categoryScore(lhr, "seo"),
    },
    coreWebVitals: {
      fcp: auditMetric(lhr, "first-contentful-paint"),
      lcp: auditMetric(lhr, "largest-contentful-paint"),
      tbt: auditMetric(lhr, "total-blocking-time"),
      cls: auditMetric(lhr, "cumulative-layout-shift"),
      speedIndex: auditMetric(lhr, "speed-index"),
      tti: auditMetric(lhr, "interactive"),
    },
    opportunities: collectOpportunities(lhr),
    reportLink: reportLink(targetUrl, strategy),
    cruxAvailable: false,
  };
}
