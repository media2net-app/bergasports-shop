import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import type { HomepageBlocks } from "@/lib/site-pages";
import { getSitePageById, updateSitePage } from "@/lib/site-pages-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }
  try {
    const page = await getSitePageById(id);
    if (!page) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pagina laden mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }
  let body: {
    title?: string;
    heading?: string | null;
    body_html?: string;
    blocks?: HomepageBlocks | null;
    meta_title?: string | null;
    meta_description?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    social_image?: string | null;
    image_alt?: string | null;
    noindex?: boolean;
    is_published?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Titel is verplicht" }, { status: 400 });
  }
  try {
    const page = await updateSitePage(id, {
      title: body.title,
      heading: body.heading,
      body_html: body.body_html,
      blocks: body.blocks,
      meta_title: body.meta_title,
      meta_description: body.meta_description,
      og_title: body.og_title,
      og_description: body.og_description,
      social_image: body.social_image,
      image_alt: body.image_alt,
      noindex: body.noindex,
      is_published: body.is_published,
    });
    return NextResponse.json(page);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Opslaan mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
