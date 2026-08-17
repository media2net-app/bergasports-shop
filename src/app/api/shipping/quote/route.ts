import { NextResponse } from "next/server";

import { quoteShipping } from "@/lib/shipping";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = (searchParams.get("country") || "NL").toUpperCase();
  const subtotal = Number.parseFloat(searchParams.get("subtotal") || "0") || 0;
  return NextResponse.json({ rates: await quoteShipping({ countryCode: country, subtotal }) });
}
