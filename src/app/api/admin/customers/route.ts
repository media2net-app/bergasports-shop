import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { createAdminCustomer, listAdminCustomerDirectory } from "@/lib/customers-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  try {
    const data = await listAdminCustomerDirectory(q);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon klanten niet laden" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: {
    email?: string;
    name?: string | null;
    phone?: string | null;
    password?: string | null;
    addresses?: Array<{
      label?: string | null;
      line1: string;
      line2?: string | null;
      postalCode: string;
      city: string;
      country?: string;
      isDefault?: boolean;
    }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const result = await createAdminCustomer({
      email: body.email ?? "",
      name: body.name,
      phone: body.phone,
      password: body.password,
      addresses: body.addresses,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Aanmaken mislukt" },
      { status: 400 },
    );
  }
}
