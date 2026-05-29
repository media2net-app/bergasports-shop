import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  getLatestPageSpeedReports,
  getPreviousPageSpeedReports,
  listPageSpeedHistory,
  savePageSpeedReport,
} from "@/lib/pagespeed-db";
import {
  pageSpeedApiKeyConfigured,
  runPageSpeedInsights,
  shopPageSpeedUrl,
} from "@/lib/pagespeed";
import type { PageSpeedStrategy } from "@/lib/pagespeed-types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseStrategy(raw: unknown): PageSpeedStrategy | null {
  if (raw === "mobile" || raw === "desktop") {
    return raw;
  }
  return null;
}

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const [latest, previous, history] = await Promise.all([
    getLatestPageSpeedReports(),
    getPreviousPageSpeedReports(),
    listPageSpeedHistory(),
  ]);

  return NextResponse.json({
    shopUrl: shopPageSpeedUrl(),
    apiKeyConfigured: pageSpeedApiKeyConfigured(),
    latest,
    previous,
    history,
  });
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  let body: { strategy?: unknown; url?: unknown };
  try {
    body = (await request.json()) as { strategy?: unknown; url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const strategy = parseStrategy(body.strategy);
  if (!strategy) {
    return NextResponse.json(
      { error: 'strategy must be "mobile" or "desktop"' },
      { status: 400 },
    );
  }

  const url = typeof body.url === "string" ? body.url : undefined;

  try {
    const beforeSave = await getLatestPageSpeedReports();
    const previousReport = strategy === "mobile" ? beforeSave.mobile : beforeSave.desktop;

    const report = await runPageSpeedInsights(strategy, url);
    const savedId = await savePageSpeedReport(report);

    return NextResponse.json({
      ...report,
      savedId,
      persisted: Boolean(savedId),
      previousReport,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PageSpeed test failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
