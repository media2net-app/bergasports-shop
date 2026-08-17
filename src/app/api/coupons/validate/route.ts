import { NextResponse } from "next/server";

import { applyCouponCode } from "@/lib/coupons";

export async function POST(request: Request) {
  let body: { code?: string; subtotal?: number };
  try {
    body = (await request.json()) as { code?: string; subtotal?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = await applyCouponCode(String(body.code ?? ""), Number(body.subtotal) || 0);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
