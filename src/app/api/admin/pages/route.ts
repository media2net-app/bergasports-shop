import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { createSitePage, listSitePages } from "@/lib/site-pages-db";
import { slugifyNl } from "@/lib/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  try {
    const pages = await listSitePages();
    return NextResponse.json({ pages });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pagina's laden mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: {
    title?: string;
    path?: string;
    slug?: string;
    heading?: string | null;
    body_html?: string;
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
  const title = body.title?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ error: "Titel is verplicht" }, { status: 400 });
  }
  const slugSource = (body.slug || body.path || title).replace(/^\//, "");
  const slug = slugifyNl(slugSource) || `pagina-${Date.now()}`;
  const path = `/${slug}`;
  try {
    const page = await createSitePage({
      title,
      slug,
      path,
      heading: body.heading,
      body_html: body.body_html,
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
    return NextResponse.json({ error: e instanceof Error ? e.message : "Aanmaken mislukt" }, { status: 500 });
  }
}
