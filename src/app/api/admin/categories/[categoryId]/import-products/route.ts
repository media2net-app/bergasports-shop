import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { importRalexProductsForCategory } from "@/lib/ralex-product-import";
import { isWritableFilesystem } from "@/lib/trendyol-json-store";

export const runtime = "nodejs";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type RouteCtx = { params: Promise<{ categoryId: string }> };

/** Haalt alle producten op voor één WooCommerce-categorie via Store API en schrijft ze naar Prisma. */
export async function POST(_request: Request, ctx: RouteCtx) {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  if (!isWritableFilesystem()) {
    return NextResponse.json(
      {
        error:
          "Write access requires DATABASE_URL in .env.local.",
      },
      { status: 503 },
    );
  }

  const { categoryId: raw } = await ctx.params;
  const categoryId = Number(raw);
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
  }

  try {
    const result = await importRalexProductsForCategory(categoryId);
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/categorii");
    /* Geen revalidatePath("/admin/categories"): dat laadt de admin-client opnieuw en breekt een lange bulk-import. */
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
