import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { listAiGeneratedImages } from "@/lib/ai-generated-images-db";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50) || 50);

  try {
    let images = await listAiGeneratedImages(limit);
    if (productId) {
      const pid = Number(productId);
      if (!Number.isNaN(pid)) {
        images = images.filter((img) => img.product_id === pid);
      }
    }
    return NextResponse.json({ images });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list images";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
