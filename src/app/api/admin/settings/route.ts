import { NextResponse } from "next/server";

import { guardAdminApi, getAdminSessionFromRequest } from "@/lib/admin-api-guard";
import { getSettingDef } from "@/lib/site-settings-defs";
import { buildAdminSettingsView, upsertSiteSettings } from "@/lib/site-settings-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const fields = await buildAdminSettingsView();
    return NextResponse.json({ fields });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon instellingen niet laden" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: { values?: Record<string, string> };
  try {
    body = (await request.json()) as { values?: Record<string, string> };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const values = body.values ?? {};
  for (const key of Object.keys(values)) {
    if (!getSettingDef(key)) {
      return NextResponse.json({ error: `Onbekende key: ${key}` }, { status: 400 });
    }
  }

  try {
    const session = await getAdminSessionFromRequest();
    const result = await upsertSiteSettings(values, session?.role ?? "admin");
    const fields = await buildAdminSettingsView();
    return NextResponse.json({ ok: true, ...result, fields });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Opslaan mislukt" },
      { status: 500 },
    );
  }
}
