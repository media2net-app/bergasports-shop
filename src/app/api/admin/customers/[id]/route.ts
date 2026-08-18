import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import {
  deleteAdminCustomer,
  getAdminCustomer,
  updateAdminCustomer,
  type AdminCustomerAddressWrite,
} from "@/lib/customers-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Ontbrekende id" }, { status: 400 });
  }
  try {
    const customer = await getAdminCustomer(id);
    if (!customer) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon klant niet laden" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Ontbrekende id" }, { status: 400 });
  }
  let body: {
    email?: string;
    name?: string | null;
    phone?: string | null;
    password?: string | null;
    addresses?: AdminCustomerAddressWrite[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const customer = await updateAdminCustomer(id, body);
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bijwerken mislukt" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Ontbrekende id" }, { status: 400 });
  }
  try {
    await deleteAdminCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verwijderen mislukt" },
      { status: 400 },
    );
  }
}
