import { NextResponse } from "next/server";

import { readConsentFromCookieString, hasMarketingConsent } from "@/lib/cookie-consent";
import { readTtclidFromCookieString } from "@/lib/tiktok-attribution";
import { sendTikTokPurchaseEvents } from "@/lib/tiktok-events-api";
import { createOrder } from "@/lib/orders-db";
import { applyRepeatDiscount, customerQualifiesForRepeatDiscount } from "@/lib/repeat-purchase-discount";
import { loadProductById } from "@/lib/products-db";
import { isProductInStock } from "@/lib/products";
import { productAvailableStock } from "@/lib/stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingCounty?: string;
  shippingPostalCode?: string;
  notes?: string;
  marketingConsent?: boolean;
  currency?: string;
  subtotal?: number;
  discountTotal?: number;
  total?: number;
  items?: Array<{
    productId: number;
    lineId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    currency: string;
    image?: string;
    variationLabel?: string;
    bundleTierId?: string;
  }>;
  ttclid?: string;
};

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const customerName = body.customerName?.trim();
  const customerPhone = body.customerPhone?.trim();
  const shippingAddress = body.shippingAddress?.trim();
  const shippingCity = body.shippingCity?.trim();
  const items = body.items ?? [];

  if (!customerName || !customerPhone || !shippingAddress || !shippingCity) {
    return NextResponse.json(
      { error: "Vul naam, telefoon, adres en plaats in." },
      { status: 400 },
    );
  }
  if (!items.length) {
    return NextResponse.json({ error: "Je winkelwagen is leeg." }, { status: 400 });
  }

  const currency = body.currency?.trim() || "EUR";
  const subtotal = Number(body.subtotal);
  let discountTotal = Number(body.discountTotal ?? 0);

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return NextResponse.json({ error: "Ongeldig totaal." }, { status: 400 });
  }

  if (await customerQualifiesForRepeatDiscount(customerPhone)) {
    discountTotal = applyRepeatDiscount(subtotal, discountTotal).discountTotal;
  }

  const total = Math.round((subtotal - discountTotal) * 100) / 100;
  if (!Number.isFinite(total) || total <= 0) {
    return NextResponse.json({ error: "Ongeldig totaal." }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie");
  const consent = readConsentFromCookieString(cookieHeader);
  const marketingConsent = body.marketingConsent === true || hasMarketingConsent(consent);

  for (const item of items) {
    if (!item.name || !item.quantity || item.quantity < 1 || !Number.isFinite(item.unitPrice)) {
      return NextResponse.json({ error: "Ongeldige orderregel." }, { status: 400 });
    }
  }

  const enrichedItems: Array<(typeof items)[number] & { sku?: string }> = [];

  for (const item of items) {
    const product = await loadProductById(item.productId);
    if (!product || product.productStatus === "concept") {
      return NextResponse.json(
        { error: `"${item.name}" is niet meer beschikbaar. Werk je winkelwagen bij en probeer opnieuw.` },
        { status: 400 },
      );
    }
    if (!isProductInStock(product)) {
      return NextResponse.json(
        { error: `"${item.name}" is niet meer op voorraad. Werk je winkelwagen bij en probeer opnieuw.` },
        { status: 400 },
      );
    }
    const available = productAvailableStock(product);
    if (available !== null && item.quantity > available) {
      return NextResponse.json(
        {
          error: `"${item.name}": nog maar ${available} st. beschikbaar. Werk je winkelwagen bij.`,
        },
        { status: 400 },
      );
    }
    enrichedItems.push({
      ...item,
      sku: product.wcSku?.trim() || undefined,
    });
  }

  try {
    const result = await createOrder({
      customerName,
      customerEmail: body.customerEmail,
      marketingConsent,
      customerPhone,
      shippingAddress,
      shippingCity,
      shippingCounty: body.shippingCounty,
      shippingPostalCode: body.shippingPostalCode,
      notes: body.notes,
      currency,
      subtotal,
      discountTotal: Number.isFinite(discountTotal) ? discountTotal : 0,
      total,
      items: enrichedItems.map((item) => ({
        productId: item.productId,
        lineId: item.lineId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        currency: item.currency || currency,
        image: item.image,
        variationLabel: item.variationLabel,
        bundleTierId: item.bundleTierId,
      })),
    });

    const orderNumber = result.orderNumber;
    const ttclid =
      body.ttclid?.trim() || readTtclidFromCookieString(cookieHeader) || null;

    if (hasMarketingConsent(consent)) {
      void sendTikTokPurchaseEvents({
      eventId: orderNumber,
      orderNumber,
      total,
      currency,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      customerEmail: body.customerEmail,
      customerPhone: customerPhone,
      ttclid,
      pageUrl: request.headers.get("referer") ?? undefined,
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null,
      userAgent: request.headers.get("user-agent"),
      }).then((r) => {
        if (!r.ok) {
          console.error("[tiktok-events-api]", orderNumber, r.errors.join("; "));
        }
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: result.id,
      orderNumber,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "De bestelling kon niet worden geplaatst.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
