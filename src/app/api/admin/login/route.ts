import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookieName,
  createAdminSessionToken,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import { resolveAdminRoleOnLogin } from "@/lib/admin-password";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set ADMIN_JWT_SECRET (min. 16 characters) and DATABASE_URL (or legacy ADMIN_PASSWORD).",
      },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email ?? "";
  const password = body.password ?? "";
  const role = await resolveAdminRoleOnLogin(email, password);
  if (!role) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const token = await createAdminSessionToken(role);
  if (!token) {
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ ok: true });
}
