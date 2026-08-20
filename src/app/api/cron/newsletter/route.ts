import { NextResponse } from "next/server";

import { runNewsletterScheduledCron } from "@/lib/newsletter-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Sending due campaigns can take a while for larger lists. */
export const maxDuration = 300;

/**
 * Vercel Cron / manual trigger for due scheduled newsletter campaigns.
 *
 * Wire-up:
 * - Set CRON_SECRET in the environment (same secret as marketing-winback).
 * - vercel.json schedules GET /api/cron/newsletter every 15 minutes.
 * - Auth: Authorization: Bearer $CRON_SECRET
 * - Local (no secret, non-production): open GET http://localhost:3060/api/cron/newsletter
 */
function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNewsletterScheduledCron();
  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
