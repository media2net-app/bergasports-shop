import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  sendNewsletterCampaign,
  serializeNewsletterCampaign,
} from "@/lib/newsletter-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Campaign sends can take a while for large lists. */
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    const result = await sendNewsletterCampaign(id);
    return NextResponse.json({
      ok: result.ok,
      error: result.error,
      campaign: serializeNewsletterCampaign(result.campaign),
    }, { status: result.ok ? 200 : 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Versturen mislukt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
