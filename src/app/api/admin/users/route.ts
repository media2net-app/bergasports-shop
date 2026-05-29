import { NextResponse } from "next/server";

import { guardSuperAdminApi } from "@/lib/admin-api-guard";
import type { AdminRole } from "@/lib/admin-auth";
import {
  deleteAdminUser,
  listAdminUsers,
  setAdminUserRole,
  upsertAdminUser,
} from "@/lib/admin-users-db";

export const dynamic = "force-dynamic";

function parseRole(raw: unknown): AdminRole | null {
  if (raw === "admin" || raw === "super_admin") {
    return raw;
  }
  return null;
}

export async function GET() {
  const denied = await guardSuperAdminApi();
  if (denied) {
    return denied;
  }
  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardSuperAdminApi();
  if (denied) {
    return denied;
  }
  let body: { email?: string; password?: string; role?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = body.email?.trim();
  const password = body.password;
  const role = parseRole(body.role) ?? "admin";
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Email and password (min. 8 characters) required" }, { status: 400 });
  }
  try {
    await upsertAdminUser(email, password, role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await guardSuperAdminApi();
  if (denied) {
    return denied;
  }
  let body: { email?: string; role?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = body.email?.trim();
  const role = parseRole(body.role);
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  try {
    if (body.password && body.password.length >= 8) {
      await upsertAdminUser(email, body.password, role ?? "admin");
    } else if (role) {
      await setAdminUserRole(email, role);
    } else {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await guardSuperAdminApi();
  if (denied) {
    return denied;
  }
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  try {
    await deleteAdminUser(email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
