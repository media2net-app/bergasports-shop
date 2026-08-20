import { NextResponse } from "next/server";

import { createContactLead } from "@/lib/contact-leads-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    kind?: string;
    preferredDate?: string;
    legalAccepted?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  if (name.length < 2 || !email.includes("@") || message.length < 8) {
    return NextResponse.json({ error: "Vul naam, e-mail en een bericht in." }, { status: 400 });
  }
  if (body.legalAccepted !== true) {
    return NextResponse.json(
      { error: "Accepteer de voorwaarden om door te gaan." },
      { status: 400 },
    );
  }
  try {
    await createContactLead({
      name,
      email,
      phone: body.phone,
      message,
      kind:
        body.kind === "appointment" ? "appointment" : body.kind === "lafuga" ? "lafuga" : "contact",
      preferredDate: body.preferredDate,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Verzenden mislukt" }, { status: 500 });
  }
}
