import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  fetchRalexCategoriesFromRemote,
  mergeCategoryImportMarkers,
  readRalexCategoriesFile,
  writeRalexCategoriesFile,
} from "@/lib/ralex-categories-file";
import { isDatabaseWritable } from "@/lib/products-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  try {
    const data = await readRalexCategoriesFile();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fout bij lezen categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Vernieuwt categories in Prisma vanaf de WordPress API (zelfde bron als het CLI-script). */
export async function POST() {
  const denied = await guard();
  if (denied) {
    return denied;
  }
  if (!isDatabaseWritable()) {
    return NextResponse.json(
      {
        error:
          "DATABASE_URL ontbreekt. Zet Prisma Postgres in .env.local om categories te synchroniseren.",
      },
      { status: 503 },
    );
  }
  try {
    const fresh = await fetchRalexCategoriesFromRemote();
    let data = fresh;
    try {
      const old = await readRalexCategoriesFile();
      data = mergeCategoryImportMarkers(fresh, old);
    } catch {
      /* eerste run of ontbrekend bestand */
    }
    await writeRalexCategoriesFile(data);
    revalidatePath("/categorii");
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
