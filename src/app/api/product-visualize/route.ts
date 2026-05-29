import { NextResponse } from "next/server";

import { loadProductById } from "@/lib/products-db";
import { checkProductVisualizeRateLimit } from "@/lib/product-visualize-rate-limit";
import { clientKeyFromRequest } from "@/lib/request-client-key";
import { visualizeProductInRoom } from "@/lib/product-visualize";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function parseDataUrlSize(dataUrl: string): number | null {
  const m = /^data:image\/[\w+.-]+;base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  return Math.floor((m[1].length * 3) / 4);
}

function siteOriginFromRequest(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const rate = checkProductVisualizeRateLimit(clientKeyFromRequest(request));
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Te veel previews. Probeer het over ${Math.ceil(rate.retryAfterSec / 60)} minuten opnieuw.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;

  if (o.consent !== true) {
    return NextResponse.json(
      { error: "Toestemming is vereist om de foto te verwerken." },
      { status: 400 },
    );
  }

  const productId = typeof o.productId === "number" ? o.productId : Number(o.productId);
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "Ongeldig product." }, { status: 400 });
  }

  const imageDataUrl = typeof o.imageDataUrl === "string" ? o.imageDataUrl.trim() : "";
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(imageDataUrl)) {
    return NextResponse.json(
      {
        error:
          "Fotoformaat niet ondersteund. Gebruik JPG/PNG of upload opnieuw (iPhone HEIC wordt in de browser automatisch geconverteerd).",
      },
      { status: 400 },
    );
  }

  const size = parseDataUrlSize(imageDataUrl);
  if (size == null) {
    return NextResponse.json({ error: "De foto kon niet worden gelezen. Probeer een andere foto." }, { status: 400 });
  }
  if (size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "De foto is te groot (max. ~6 MB). Probeer een kleinere foto." },
      { status: 400 },
    );
  }

  const product = await loadProductById(productId);
  if (!product) {
    return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
  }

  const productImage = product.image || product.images?.[0];
  if (!productImage) {
    return NextResponse.json({ error: "Het product heeft geen afbeelding voor preview." }, { status: 400 });
  }

  try {
    const { pngBuffer, revisedPrompt } = await visualizeProductInRoom({
      roomDataUrl: imageDataUrl,
      productImageUrl: productImage,
      productName: product.name,
      category: product.category,
      siteOrigin: siteOriginFromRequest(request),
    });

    const resultImageDataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

    return NextResponse.json({
      ok: true,
      resultImageDataUrl,
      revisedPrompt,
      productName: product.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "De preview is mislukt.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
