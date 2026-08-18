import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { createAdminBrand, listAdminBrands } from "@/lib/brands-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const brands = await listAdminBrands();
    return NextResponse.json({ brands });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon merken niet laden" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: { name?: string; slug?: string; logoUrl?: string | null; visible?: boolean; sortOrder?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const brand = await createAdminBrand({
      name: body.name ?? "",
      slug: body.slug,
      logoUrl: body.logoUrl,
      visible: body.visible,
      sortOrder: body.sortOrder,
    });
    return NextResponse.json({ brand });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Aanmaken mislukt" }, { status: 400 });
  }
}
