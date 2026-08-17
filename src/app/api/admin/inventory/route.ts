import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { productPath, resolveProductSlug } from "@/lib/product-slug";
import {
  getProductRawById,
  isWritableFilesystem,
  upsertProductRaw,
} from "@/lib/trendyol-json-store";

type PatchBody = {
  id?: number;
  /** Aantal stuks; null wist het aantal en laat inStock beslissen. */
  stockQuantity?: number | null;
  inStock?: boolean;
};

/** Voorraad bijwerken zonder het hele product mee te sturen (voor het voorraadoverzicht). */
export async function PATCH(request: Request) {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  if (!isWritableFilesystem()) {
    return NextResponse.json(
      { error: "Deze omgeving is alleen-lezen; voorraad kan hier niet worden opgeslagen." },
      { status: 503 },
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldig product-id" }, { status: 400 });
  }

  const product = await getProductRawById(id);
  if (!product) {
    return NextResponse.json({ error: "Product niet gevonden" }, { status: 404 });
  }

  const next = { ...product };

  if ("stockQuantity" in body) {
    if (body.stockQuantity === null) {
      delete next.stockQuantity;
    } else {
      const qty = Number(body.stockQuantity);
      if (!Number.isFinite(qty) || qty < 0) {
        return NextResponse.json({ error: "Aantal moet 0 of hoger zijn" }, { status: 400 });
      }
      next.stockQuantity = Math.floor(qty);
      /* Aantal ingevuld: laat inStock het aantal volgen, anders spreken ze elkaar tegen. */
      next.inStock = Math.floor(qty) > 0;
    }
  }

  if (typeof body.inStock === "boolean") {
    next.inStock = body.inStock;
    if (!body.inStock && typeof next.stockQuantity === "number" && next.stockQuantity > 0) {
      next.stockQuantity = 0;
    }
  }

  try {
    await upsertProductRaw(next);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Opslaan mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  revalidatePath("/shop");
  revalidatePath(productPath(resolveProductSlug(next)));

  return NextResponse.json({
    ok: true,
    stockQuantity: next.stockQuantity ?? null,
    inStock: next.inStock !== false,
  });
}
