import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getAiGeneratedImageById, markAiGeneratedImageInstalled } from "@/lib/ai-generated-images-db";
import { productPath, resolveProductSlug } from "@/lib/product-slug";
import { getProductRawById, upsertProductRaw } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await params;
  const generated = await getAiGeneratedImageById(id);
  if (!generated) {
    return NextResponse.json({ error: "Generated image not found" }, { status: 404 });
  }

  if (!generated.product_id) {
    return NextResponse.json(
      { error: "This image has no linked catalog product. Select a product when generating." },
      { status: 400 },
    );
  }

  const product = await getProductRawById(generated.product_id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const imageUrl = generated.public_url;
  const images = [imageUrl, ...(product.images ?? []).filter((u) => u && u !== imageUrl)];

  await upsertProductRaw({
    ...product,
    image: imageUrl,
    images,
  });

  await markAiGeneratedImageInstalled(id);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${product.id}`);
  revalidatePath("/shop");
  revalidatePath(productPath(resolveProductSlug(product)));
  revalidatePath(`/product/${product.id}`);

  return NextResponse.json({
    ok: true,
    productId: product.id,
    imageUrl,
    productEditUrl: `/admin/products/${product.id}`,
  });
}
