import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { isEmailTemplateKey } from "@/lib/email-template-defs";
import {
  adminInputToPreviewOrder,
  buildEmailVars,
  customerOnlyOrder,
  renderEmailTemplate,
  withShippedPreview,
} from "@/lib/email-template-render";
import { loadAdminNewOrderEmailPreviewInput, loadOrderForEmailPreview } from "@/lib/email-preview-data";
import { getEmailLogoUrlSetting, getWinBackEmailSettings } from "@/lib/shop-runtime";
import { getRuntimeSetting } from "@/lib/site-settings-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expiryDateNl(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(d);
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: { key?: string; subject?: string; title?: string; bodyHtml?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  const key = body.key?.trim() ?? "";
  if (!isEmailTemplateKey(key)) {
    return NextResponse.json({ error: "Onbekend mailtype" }, { status: 400 });
  }
  try {
    const [order, adminInput, logoUrl, winBack] = await Promise.all([
      loadOrderForEmailPreview(),
      loadAdminNewOrderEmailPreviewInput(),
      getEmailLogoUrlSetting(),
      getWinBackEmailSettings(),
    ]);
    const extra = {
      winBackCode: winBack.code,
      winBackExpiry: expiryDateNl(winBack.expiryDays),
      welcomeCode: (await getRuntimeSetting("NEWSLETTER_PROMO_CODE")).trim().toUpperCase() || "WELCOME5",
    };
    let previewOrder = order;
    if (key === "order.admin_new") {
      previewOrder = adminInputToPreviewOrder(adminInput);
    } else if (key === "order.shipped") {
      previewOrder = withShippedPreview(order);
    } else if (key === "marketing.welcome" || key === "marketing.win_back") {
      previewOrder = customerOnlyOrder(order.customer_name);
    }
    const { subject, html } = renderEmailTemplate(
      {
        subject: body.subject ?? "",
        title: body.title ?? "",
        bodyHtml: body.bodyHtml ?? "",
      },
      buildEmailVars(previewOrder, extra),
      logoUrl,
    );
    return NextResponse.json({ subject, html });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Voorbeeld mislukt" }, { status: 500 });
  }
}
