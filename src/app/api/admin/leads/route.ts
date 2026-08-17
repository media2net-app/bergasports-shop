import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { listContactLeads, setContactLeadStatus } from "@/lib/contact-leads-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const leads = await listContactLeads();
  return NextResponse.json({ leads });
}

export async function PATCH(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: { id?: string; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  if (!body.id || (body.status !== "new" && body.status !== "handled")) {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }
  await setContactLeadStatus(body.id, body.status);
  return NextResponse.json({ ok: true });
}
