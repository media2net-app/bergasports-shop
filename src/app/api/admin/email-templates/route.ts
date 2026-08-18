import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { listEmailTemplates } from "@/lib/email-templates-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fout" }, { status: 500 });
  }
}
