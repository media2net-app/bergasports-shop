import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { deleteProductsRaw, isWritableFilesystem } from "@/lib/trendyol-json-store";

const MAX_IDS = 50;

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  if (!isWritableFilesystem()) {
    return NextResponse.json(
      {
        error:
          "Writing is disabled on this host. Delete locally or use a database with service role.",
      },
      { status: 503 },
    );
  }

  let body: { ids?: unknown };
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.ids) ? body.ids : [];
  const ids = raw
    .map((x) => (typeof x === "number" ? x : Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, MAX_IDS);

  if (!ids.length) {
    return NextResponse.json({ error: "Geen geldige ids (max " + MAX_IDS + ")" }, { status: 400 });
  }

  try {
    const removed = await deleteProductsRaw(ids);
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/admin/products");
    for (const id of ids) {
      revalidatePath(`/product/${id}`);
    }
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
