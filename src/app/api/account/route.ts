import { NextResponse } from "next/server";

import {
  createCustomerSessionToken,
  CUSTOMER_COOKIE,
  loginCustomer,
  registerCustomer,
} from "@/lib/customer-auth";

export async function POST(request: Request) {
  let body: { action?: string; email?: string; password?: string; name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "register") {
    const result = await registerCustomer({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const token = createCustomerSessionToken(result.id, (body.email ?? "").trim().toLowerCase());
    if (!token) return NextResponse.json({ error: "Sessie mislukt" }, { status: 500 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  const result = await loginCustomer(body.email ?? "", body.password ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  const token = createCustomerSessionToken(result.id, result.email);
  if (!token) return NextResponse.json({ error: "Sessie mislukt" }, { status: 500 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
