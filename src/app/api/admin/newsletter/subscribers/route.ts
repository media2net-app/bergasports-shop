import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  adminAddNewsletterSubscriber,
  deleteNewsletterSubscriber,
  listNewsletterSubscribers,
  serializeNewsletterSubscriber,
  setNewsletterSubscriberStatus,
  type NewsletterSubscriberStatus,
} from "@/lib/newsletter-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const rawStatus = url.searchParams.get("status") ?? "all";
  const status: NewsletterSubscriberStatus | "all" =
    rawStatus === "active" || rawStatus === "unsubscribed" || rawStatus === "all"
      ? rawStatus
      : "all";

  const subscribers = await listNewsletterSubscribers({ q, status });
  return NextResponse.json({
    subscribers: subscribers.map(serializeNewsletterSubscriber),
  });
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: {
    email?: string;
    name?: string;
    locale?: string;
    source?: string;
    sendWelcome?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const result = await adminAddNewsletterSubscriber({
    email: body.email ?? "",
    name: body.name,
    locale: body.locale,
    source: body.source,
    sendWelcome: Boolean(body.sendWelcome),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    reactivated: result.reactivated,
    welcomeSent: result.welcomeSent,
    subscriber: serializeNewsletterSubscriber(result.subscriber),
  });
}

export async function PATCH(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: { id?: string; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!body.id || (body.status !== "active" && body.status !== "unsubscribed")) {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  const row = await setNewsletterSubscriberStatus(body.id, body.status);
  if (!row) {
    return NextResponse.json({ error: "Abonnee niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    subscriber: serializeNewsletterSubscriber(row),
  });
}

export async function DELETE(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id ontbreekt" }, { status: 400 });
  }
  const ok = await deleteNewsletterSubscriber(id);
  if (!ok) {
    return NextResponse.json({ error: "Abonnee niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
