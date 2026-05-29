import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { productPath, resolveProductSlug } from "@/lib/product-slug";
import type { TrendyolJsonProduct } from "@/lib/products";
import {
  isWritableFilesystem,
  nextProductId,
  readTrendyolDatabase,
  upsertProductRaw,
} from "@/lib/trendyol-json-store";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  try {
    const db = await readTrendyolDatabase();
    return NextResponse.json({
      meta: {
        seller: db.seller,
        count: db.count,
        scrapedAt: db.scrapedAt,
      },
      products: db.products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        priceDiscounted: p.priceDiscounted,
        priceCurrent: p.priceCurrent,
        currency: p.currency,
        catalogSource: p.catalogSource ?? "trendyol",
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fout bij lezen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function defaultNewProduct(id: number): TrendyolJsonProduct {
  return {
    id,
    name: "Nieuw product",
    brand: "",
    category: "",
    merchantId: 1185891,
    url: "",
    image: "",
    images: [],
    currency: "Lei",
    priceCurrent: 0,
    priceCurrentText: "0",
    priceDiscounted: 0,
    priceDiscountedText: "0",
    priceOld: 0,
    discount: { discountName: "" },
    freeCargo: true,
    sameDayShipping: false,
    hasFastDeliveryTag: false,
    hasFlashSaleTag: false,
    promotions: [],
    badges: {},
    socialProof: [],
    catalogSource: "manual",
  };
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
          "Write access requires DATABASE_URL in .env.local.",
      },
      { status: 503 },
    );
  }

  let body: Partial<TrendyolJsonProduct> | null = null;
  try {
    body = (await request.json()) as Partial<TrendyolJsonProduct>;
  } catch {
    body = null;
  }

  try {
    const id = body?.id && typeof body.id === "number" ? body.id : await nextProductId();
    const product: TrendyolJsonProduct = { ...defaultNewProduct(id), ...body, id };
    await upsertProductRaw(product);
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath(productPath(resolveProductSlug(product)));
    revalidatePath(`/product/${product.id}`);
    return NextResponse.json({ ok: true, id: product.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
