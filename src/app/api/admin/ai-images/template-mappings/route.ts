import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { AI_IMAGE_TEMPLATES } from "@/lib/ai-image-templates";
import {
  readAiImageTemplateMappings,
  writeAiImageTemplateMappings,
} from "@/lib/ai-image-template-mappings-db";
import { loadRalexCategories } from "@/lib/categories-db";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    const [mappings, categories] = await Promise.all([
      readAiImageTemplateMappings(),
      loadRalexCategories(),
    ]);
    return NextResponse.json({
      mappings,
      templates: AI_IMAGE_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        referenceImageUrl: t.referenceImageUrl,
      })),
      categoryTree: categories.tree,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load mappings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body && typeof body === "object" && "mappings" in body ? (body as { mappings: unknown }).mappings : null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Expected { mappings: Record<string, string> }" }, { status: 400 });
  }

  const validIds = new Set(AI_IMAGE_TEMPLATES.map((t) => t.id));
  const mappings: Record<string, string> = {};
  for (const [slug, templateId] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof slug !== "string" || typeof templateId !== "string") {
      continue;
    }
    const s = slug.trim();
    const t = templateId.trim();
    if (!s || !t) {
      continue;
    }
    if (!validIds.has(t)) {
      return NextResponse.json({ error: `Unknown template id: ${t}` }, { status: 400 });
    }
    mappings[s] = t;
  }

  try {
    await writeAiImageTemplateMappings(mappings);
    return NextResponse.json({ ok: true, mappings });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save mappings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
