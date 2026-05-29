import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName } from "@/lib/admin-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
