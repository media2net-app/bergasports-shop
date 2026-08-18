import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { isEmailTemplateKey, type EmailTemplateDraft } from "@/lib/email-template-defs";
import { getEmailTemplate, resetEmailTemplate, saveEmailTemplate } from "@/lib/email-templates-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ key: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { key } = await ctx.params;
  const decoded = decodeURIComponent(key);
  if (!isEmailTemplateKey(decoded)) {
    return NextResponse.json({ error: "Onbekend mailtype" }, { status: 404 });
  }
  try {
    const template = await getEmailTemplate(decoded);
    return NextResponse.json({ template });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fout" }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { key } = await ctx.params;
  const decoded = decodeURIComponent(key);
  if (!isEmailTemplateKey(decoded)) {
    return NextResponse.json({ error: "Onbekend mailtype" }, { status: 404 });
  }
  let body: { subject?: string; title?: string; bodyHtml?: string; translations?: EmailTemplateDraft["translations"] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const template = await saveEmailTemplate(decoded, {
      subject: body.subject ?? "",
      title: body.title ?? "",
      bodyHtml: body.bodyHtml ?? "",
      translations: body.translations,
    });
    revalidatePath("/admin/email");
    return NextResponse.json({ template });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Opslaan mislukt" }, { status: 500 });
  }
}

export async function POST(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { key } = await ctx.params;
  const decoded = decodeURIComponent(key);
  if (!isEmailTemplateKey(decoded)) {
    return NextResponse.json({ error: "Onbekend mailtype" }, { status: 404 });
  }
  try {
    const template = await resetEmailTemplate(decoded);
    revalidatePath("/admin/email");
    return NextResponse.json({ template });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Reset mislukt" }, { status: 500 });
  }
}
