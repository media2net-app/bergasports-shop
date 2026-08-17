import { NextResponse } from "next/server";

import { isMollieConfigured, listMollieMethods } from "@/lib/mollie";

export async function GET(request: Request) {
  if (!(await isMollieConfigured())) {
    return NextResponse.json({ methods: [] });
  }
  const { searchParams } = new URL(request.url);
  const amount = Number.parseFloat(searchParams.get("amount") || "0");
  const currency = (searchParams.get("currency") || "EUR").toUpperCase();
  const locale = searchParams.get("locale") || "nl_NL";
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  try {
    const methods = await listMollieMethods({ amount, currency, locale });
    return NextResponse.json({ methods });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mollie methods failed", methods: [] },
      { status: 502 },
    );
  }
}
