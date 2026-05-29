import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { productPath, resolveProductSlug } from "@/lib/product-slug";
import type { TrendyolJsonProduct } from "@/lib/products";
import {
  deleteProductRaw,
  getProductRawById,
  isWritableFilesystem,
  upsertProductRaw,
} from "@/lib/trendyol-json-store";

type RouteParams = { params: Promise<{ id: string }> };

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const product = await getProductRawById(id);
    if (!product) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  if (!isWritableFilesystem()) {
    return NextResponse.json(
      {
        error:
          "Writing is disabled on this host. Edit products locally or use a database with service role.",
      },
      { status: 503 },
    );
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: TrendyolJsonProduct;
  try {
    body = (await request.json()) as TrendyolJsonProduct;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.id !== id) {
    return NextResponse.json({ error: "Id in URL en body komen niet overeen" }, { status: 400 });
  }

  try {
    await upsertProductRaw(body);
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath(productPath(resolveProductSlug(body)));
    revalidatePath(`/product/${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  if (!isWritableFilesystem()) {
    return NextResponse.json(
      {
        error:
          "Writing is disabled on this host. Edit products locally or use a database with service role.",
      },
      { status: 503 },
    );
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const ok = await deleteProductRaw(id);
    if (!ok) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath(`/product/${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
