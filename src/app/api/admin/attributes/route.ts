import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { createAdminAttribute, listAdminAttributes } from "@/lib/attributes-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const attributes = await listAdminAttributes();
    return NextResponse.json({ attributes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon attributen niet laden" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: {
    name?: string;
    slug?: string;
    type?: string;
    orderBy?: string | null;
    hasArchives?: boolean;
    sortOrder?: number;
    terms?: { name: string; slug?: string; menuOrder?: number }[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const attribute = await createAdminAttribute({
      name: body.name ?? "",
      slug: body.slug,
      type: body.type,
      orderBy: body.orderBy,
      hasArchives: body.hasArchives,
      sortOrder: body.sortOrder,
      terms: body.terms,
    });
    return NextResponse.json({ attribute });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Aanmaken mislukt" }, { status: 400 });
  }
}
