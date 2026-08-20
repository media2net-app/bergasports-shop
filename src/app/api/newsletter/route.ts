import { NextResponse } from "next/server";

import { subscribeNewsletter } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; source?: string; locale?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }

  const result = await subscribeNewsletter({
    email: body.email ?? "",
    source: body.source,
    locale: body.locale,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    label: result.label,
    alreadySubscribed: result.alreadySubscribed,
    emailSent: result.emailSent,
  });
}
