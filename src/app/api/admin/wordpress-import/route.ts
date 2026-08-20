import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { importWordpressFromSettings, getWordpressImportCredentials } from "@/lib/wordpress-import";
import {
  importLocaleFromBaseUrl,
  parseImportTypes,
  WORDPRESS_IMPORT_TYPES,
} from "@/lib/wordpress-import-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const creds = await getWordpressImportCredentials();
  return NextResponse.json({
    baseUrl: creds.baseUrl,
    detectedLocale: importLocaleFromBaseUrl(creds.baseUrl),
    wooConfigured: Boolean(creds.auth),
    wpAuthConfigured: Boolean(creds.wpAuth),
    types: WORDPRESS_IMPORT_TYPES,
  });
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let types: ReturnType<typeof parseImportTypes>;
  let dryRun = false;
  let maxPages: number | undefined;
  let locale: string | undefined;
  let baseUrl: string | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      types?: unknown;
      dryRun?: boolean;
      maxPages?: number;
      locale?: string;
      baseUrl?: string;
    };
    types = parseImportTypes(body.types);
    dryRun = Boolean(body.dryRun);
    if (typeof body.maxPages === "number" && body.maxPages > 0) {
      maxPages = Math.min(200, body.maxPages);
    }
    if (typeof body.locale === "string" && body.locale.trim()) {
      locale = body.locale.trim().toLowerCase();
    }
    if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
      baseUrl = body.baseUrl.trim();
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ongeldige import-aanvraag" },
      { status: 400 },
    );
  }

  try {
    const result = await importWordpressFromSettings({ types, dryRun, maxPages, locale, baseUrl });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
