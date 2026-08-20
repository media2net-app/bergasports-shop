import { NextResponse } from "next/server";

import { guardAdminApi, getAdminSessionFromRequest } from "@/lib/admin-api-guard";
import { getSettingDef, isMaskedSecretInput } from "@/lib/site-settings-defs";
import { buildAdminSettingsView, upsertSiteSettings } from "@/lib/site-settings-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function looksLikeOpenAiKey(value: string): boolean {
  const v = value.trim();
  return /^sk-[A-Za-z0-9_-]{10,}/.test(v) || /^sk-proj-[A-Za-z0-9_-]{10,}/.test(v);
}

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const fields = await buildAdminSettingsView({ fresh: true });
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

  const openAiRaw = values.OPENAI_API_KEY;
  if (typeof openAiRaw === "string") {
    const trimmed = openAiRaw.trim();
    if (trimmed && !isMaskedSecretInput(trimmed) && !looksLikeOpenAiKey(trimmed)) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY lijkt ongeldig. Plak een volledige key die begint met sk- of sk-proj- (niet het gemaskeerde ••••-voorbeeld).",
        },
        { status: 400 },
      );
    }
  }

  try {
    const session = await getAdminSessionFromRequest();
    const result = await upsertSiteSettings(values, session?.role ?? "admin");
    // Fresh read so secrets just written are marked configured (React cache would be stale).
    const fields = await buildAdminSettingsView({ fresh: true });
    return NextResponse.json({ ok: true, ...result, fields });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Opslaan mislukt" },
      { status: 500 },
    );
  }
}
