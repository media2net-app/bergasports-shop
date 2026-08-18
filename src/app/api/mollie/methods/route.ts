import { NextResponse } from "next/server";

import { isMollieConfigured, listMollieMethods } from "@/lib/mollie";
import {
  fallbackShopMollieMethods,
  mollieBillingCountry,
  mollieLocaleForCountry,
} from "@/lib/mollie-methods";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackPayload(configured: boolean) {
  return {
    methods: fallbackShopMollieMethods(),
    fallback: true,
    configured,
  };
}

export async function GET(request: Request) {
  const configured = await isMollieConfigured();
  if (!configured) {
    return NextResponse.json(fallbackPayload(false));
  }
  const { searchParams } = new URL(request.url);
  const amount = Number.parseFloat(searchParams.get("amount") || "0");
  const currency = (searchParams.get("currency") || "EUR").toUpperCase();
  const country = (searchParams.get("country") || "NL").toUpperCase();
  const billingCountry = mollieBillingCountry(country);
  const locale = searchParams.get("locale") || mollieLocaleForCountry(country);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  try {
    const methods = await listMollieMethods({
      amount,
      currency,
      locale,
      billingCountry,
    });
    if (methods.length === 0) {
      return NextResponse.json(fallbackPayload(true));
    }
    return NextResponse.json({ methods, fallback: false, configured: true });
  } catch (e) {
    console.error("[mollie-methods]", e instanceof Error ? e.message : e);
    return NextResponse.json(fallbackPayload(true));
  }
}
