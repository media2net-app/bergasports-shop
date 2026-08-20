import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  createNewsletterCampaign,
  listNewsletterCampaigns,
  serializeNewsletterCampaign,
} from "@/lib/newsletter-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseScheduledAt(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const campaigns = await listNewsletterCampaigns();
  return NextResponse.json({ campaigns: campaigns.map(serializeNewsletterCampaign) });
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: {
    subject?: string;
    title?: string;
    bodyHtml?: string;
    scheduledAt?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const scheduledAt = parseScheduledAt(body.scheduledAt);
  if (
    body.scheduledAt !== undefined &&
    body.scheduledAt !== null &&
    body.scheduledAt !== "" &&
    scheduledAt === undefined
  ) {
    return NextResponse.json({ error: "Ongeldige plan-tijd" }, { status: 400 });
  }

  try {
    const campaign = await createNewsletterCampaign({
      subject: body.subject ?? "",
      title: body.title,
      bodyHtml: body.bodyHtml ?? "",
      scheduledAt: scheduledAt === undefined ? null : scheduledAt,
    });
    return NextResponse.json({ ok: true, campaign: serializeNewsletterCampaign(campaign) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Opslaan mislukt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
