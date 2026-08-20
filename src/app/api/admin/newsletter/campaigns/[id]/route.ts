import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  cancelNewsletterCampaignSchedule,
  deleteNewsletterCampaign,
  duplicateNewsletterCampaign,
  getNewsletterCampaign,
  scheduleNewsletterCampaign,
  serializeNewsletterCampaign,
  updateNewsletterCampaign,
} from "@/lib/newsletter-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseScheduledAt(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export async function GET(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  const campaign = await getNewsletterCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campagne niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ campaign: serializeNewsletterCampaign(campaign) });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;

  let body: {
    subject?: string;
    title?: string | null;
    bodyHtml?: string;
    scheduledAt?: string | null;
    clearSchedule?: boolean;
    action?: "schedule" | "cancel_schedule" | "duplicate";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  try {
    if (body.action === "duplicate") {
      const campaign = await duplicateNewsletterCampaign(id);
      if (!campaign) {
        return NextResponse.json({ error: "Campagne niet gevonden" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, campaign: serializeNewsletterCampaign(campaign) });
    }

    if (body.action === "cancel_schedule") {
      const campaign = await cancelNewsletterCampaignSchedule(id);
      if (!campaign) {
        return NextResponse.json({ error: "Campagne niet gevonden" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, campaign: serializeNewsletterCampaign(campaign) });
    }

    if (body.action === "schedule") {
      const at = parseScheduledAt(body.scheduledAt);
      if (!at) {
        return NextResponse.json({ error: "Plan-tijd is verplicht" }, { status: 400 });
      }
      const campaign = await scheduleNewsletterCampaign(id, at);
      if (!campaign) {
        return NextResponse.json({ error: "Campagne niet gevonden" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, campaign: serializeNewsletterCampaign(campaign) });
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

    const campaign = await updateNewsletterCampaign(id, {
      subject: body.subject,
      title: body.title,
      bodyHtml: body.bodyHtml,
      ...(body.clearSchedule
        ? { clearSchedule: true }
        : scheduledAt !== undefined
          ? { scheduledAt }
          : {}),
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campagne niet gevonden" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, campaign: serializeNewsletterCampaign(campaign) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Opslaan mislukt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const ok = await deleteNewsletterCampaign(id);
    if (!ok) {
      return NextResponse.json({ error: "Campagne niet gevonden" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verwijderen mislukt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
