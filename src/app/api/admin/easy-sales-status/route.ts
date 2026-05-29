import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getEasySalesConfig, testEasySalesConnection } from "@/lib/easy-sales";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  const config = getEasySalesConfig();
  if (!config) {
    return NextResponse.json({
      ok: false,
      label: "Not configured",
      detail: "Set EASY_SALES_API_TOKEN and EASY_SALES_WEBSITE_TOKEN on the server",
    });
  }

  const started = Date.now();
  const result = await testEasySalesConnection();
  const latencyMs = Date.now() - started;

  return NextResponse.json({
    ok: result.ok,
    label: result.ok ? "Connected" : "No connection",
    detail: result.message,
    latencyMs,
    configured: {
      baseUrl: config.baseUrl,
      hasWebsiteToken: Boolean(config.websiteToken),
      hasClientCredentials: Boolean(config.clientId && config.clientSecret),
    },
  });
}
