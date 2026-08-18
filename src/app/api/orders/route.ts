import { NextResponse } from "next/server";

import { readConsentFromCookieString, hasMarketingConsent } from "@/lib/cookie-consent";
import {
  attachMolliePaymentId,
  createOrder,
} from "@/lib/orders-db";
import { applyRepeatDiscount, customerQualifiesForRepeatDiscount } from "@/lib/repeat-purchase-discount";
import { loadProductById } from "@/lib/products-db";
import { isProductInStock } from "@/lib/products";
import { productAvailableStock } from "@/lib/stock";
import {
  createMolliePayment,
  isMollieConfigured,
  listMollieMethods,
  mollieCheckoutUrl,
} from "@/lib/mollie";
import {
  mollieBillingCountry,
  mollieLocaleForCountry,
  sanitizeMollieMethodId,
} from "@/lib/mollie-methods";
import { applyCouponCode } from "@/lib/coupons";
import { getShippingQuote } from "@/lib/shipping";

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
  shippingCountry?: string;
  shippingMethod?: string;
  shippingCost?: number;
  couponCode?: string;
  mollieMethod?: string;
  notes?: string;
  marketingConsent?: boolean;
  legalAccepted?: boolean;
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

function siteBaseUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return "https://bergasports.vercel.app";
}

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
  const paymentMethod = "mollie";

  if (!customerName || !customerPhone || !shippingAddress || !shippingCity) {
    return NextResponse.json(
      { error: "Vul naam, telefoon, adres en plaats in." },
      { status: 400 },
    );
  }
  if (!body.customerEmail?.trim()) {
    return NextResponse.json(
      { error: "E-mail is verplicht voor online betalen." },
      { status: 400 },
    );
  }
  if (body.legalAccepted !== true) {
    return NextResponse.json(
      { error: "Accepteer de voorwaarden om door te gaan." },
      { status: 400 },
    );
  }
  if (!(await isMollieConfigured())) {
    return NextResponse.json(
      { error: "Online betalen is tijdelijk niet beschikbaar." },
      { status: 503 },
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

  if (body.couponCode?.trim()) {
    const coupon = await applyCouponCode(body.couponCode, subtotal);
    if (coupon.ok) {
      discountTotal = Math.max(discountTotal, coupon.discount);
    }
  }

  if (await customerQualifiesForRepeatDiscount(customerPhone)) {
    discountTotal = (await applyRepeatDiscount(subtotal, discountTotal)).discountTotal;
  }

  const country = (body.shippingCountry || "NL").toUpperCase();
  const shipMethod = body.shippingMethod || "standard";
  const shipQuote = await getShippingQuote(country, shipMethod, subtotal - discountTotal);
  const shippingCost = shipQuote?.price ?? Number(body.shippingCost ?? 0) ?? 0;

  const total =
    Math.round((subtotal - discountTotal + (Number.isFinite(shippingCost) ? shippingCost : 0)) * 100) /
    100;
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

  const locale = mollieLocaleForCountry(country);
  const billingCountry = mollieBillingCountry(country);
  let method = sanitizeMollieMethodId(body.mollieMethod);
  if (method) {
    try {
      const available = await listMollieMethods({
        amount: total,
        currency,
        locale,
        billingCountry,
      });
      if (!available.some((m) => m.id === method)) {
        method = undefined;
      }
    } catch {
      // Keep sanitized id; Mollie hosted checkout is used if createPayment rejects it.
    }
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
      notes: [
        body.notes?.trim(),
        shipQuote ? `Verzending: ${shipQuote.label} (€ ${shippingCost.toFixed(2)})` : null,
        body.couponCode?.trim() ? `Coupon: ${body.couponCode.trim().toUpperCase()}` : null,
      ]
        .filter(Boolean)
        .join("\n") || undefined,
      paymentMethod: method ? `mollie:${method}` : paymentMethod,
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
    const base = siteBaseUrl(request);

    const payment = await createMolliePayment({
      amount: total,
      currency,
      description: `Bergasports bestelling ${orderNumber}`,
      redirectUrl: `${base}/checkout/return?order=${encodeURIComponent(orderNumber)}`,
      webhookUrl: `${base}/api/mollie/webhook`,
      metadata: {
        orderId: String(result.id),
        orderNumber,
      },
      method,
      locale,
    }).catch(async (err) => {
      if (!method) throw err;
      return createMolliePayment({
        amount: total,
        currency,
        description: `Bergasports bestelling ${orderNumber}`,
        redirectUrl: `${base}/checkout/return?order=${encodeURIComponent(orderNumber)}`,
        webhookUrl: `${base}/api/mollie/webhook`,
        metadata: {
          orderId: String(result.id),
          orderNumber,
        },
        locale,
      });
    });
    await attachMolliePaymentId(result.id, payment.id);
    const checkoutUrl = mollieCheckoutUrl(payment);
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Mollie checkout-URL ontbreekt. Probeer opnieuw." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      orderId: result.id,
      orderNumber,
      paymentMethod: "mollie",
      checkoutUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "De bestelling kon niet worden geplaatst.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
