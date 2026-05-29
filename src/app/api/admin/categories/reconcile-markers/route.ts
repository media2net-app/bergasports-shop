import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { reconcileRalexCategoryImportMarkers } from "@/lib/ralex-category-import-reconcile";
import { isDatabaseWritable } from "@/lib/products-db";

export const runtime = "nodejs";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Past import-markers in Prisma aan voor lege categories en waar al genoeg Ralex-producten in de DB staan. */
export async function POST() {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  if (!isDatabaseWritable()) {
    return NextResponse.json(
      { error: "DATABASE_URL is missing; reconcile not available." },
      { status: 503 },
    );
  }
  try {
    const { patched, data } = await reconcileRalexCategoryImportMarkers();
    /* Geen revalidatePath admin: client zet state zelf; voorkomt volledige pagina-refresh tijdens bulk. */
    return NextResponse.json({ ok: true, patched, ...data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reconcile failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
