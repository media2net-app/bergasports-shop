import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  createNewsPost,
  loadAdminNewsPosts,
  type NewsPostInput,
} from "@/lib/news-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const posts = await loadAdminNewsPosts();
    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fout" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: NewsPostInput;
  try {
    body = (await request.json()) as NewsPostInput;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Titel is verplicht" }, { status: 400 });
  }
  try {
    const post = await createNewsPost({ ...body, bodyHtml: body.bodyHtml ?? "" });
    revalidatePath("/nieuws");
    revalidatePath("/admin/news");
    return NextResponse.json(post);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Opslaan mislukt" }, { status: 500 });
  }
}
