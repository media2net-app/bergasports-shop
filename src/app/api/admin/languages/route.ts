import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { addShopLanguage, listShopLanguages, unusedCatalogLanguages } from "@/lib/i18n/shop-languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const languages = await listShopLanguages();
    return NextResponse.json({ languages, catalog: unusedCatalogLanguages(languages) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fout" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const language = await addShopLanguage(body.code ?? "");
    return NextResponse.json({ language });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Toevoegen mislukt" }, { status: 400 });
  }
}
