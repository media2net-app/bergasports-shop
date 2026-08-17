import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteNewsPost, loadNewsPostById, updateNewsPost, type NewsPostInput } from "@/lib/news-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  const post = await loadNewsPostById(id);
  if (!post) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(request: Request, context: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
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
    const post = await updateNewsPost(id, { ...body, bodyHtml: body.bodyHtml ?? "" });
    revalidatePath("/nieuws");
    revalidatePath(`/nieuws/${post.slug}`);
    revalidatePath("/admin/news");
    return NextResponse.json(post);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Opslaan mislukt" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    await deleteNewsPost(id);
    revalidatePath("/nieuws");
    revalidatePath("/admin/news");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Verwijderen mislukt" }, { status: 500 });
  }
}
