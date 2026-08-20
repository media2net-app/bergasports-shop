import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  listNewsletterSubscribers,
  newsletterSubscribersToCsv,
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

  const subscribers = await listNewsletterSubscribers({ q, status, limit: 5000 });
  const csv = newsletterSubscribersToCsv(subscribers);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-subscribers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
