import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { mirrorProductImagesIfNeeded } from "@/lib/product-image-storage";
import { fetchAllProductsRaw, saveProductRawWithoutImageMirror } from "@/lib/products-db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  let body: { offset?: number; limit?: number; productId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const limit = Math.min(25, Math.max(1, Number(body.limit) || 10));
  const offset = Math.max(0, Number(body.offset) || 0);
  const productId = Number(body.productId) || 0;

  try {
    let products = await fetchAllProductsRaw();
    if (productId > 0) {
      products = products.filter((p) => p.id === productId);
    } else {
      products = products.slice(offset, offset + limit);
    }

    let updated = 0;
    let mirrored = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        const result = await mirrorProductImagesIfNeeded(product);
        mirrored += result.mirroredCount;
        if (result.changed) {
          await saveProductRawWithoutImageMirror(result.product);
          updated += 1;
        }
      } catch (e) {
        errors.push(`${product.id}: ${e instanceof Error ? e.message : "error"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      processed: products.length,
      updated,
      mirrored,
      nextOffset: productId > 0 ? null : offset + products.length,
      errors,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Migratie mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
