import { NextResponse } from "next/server";

import { loadRalexCategories } from "@/lib/categories-db";

export async function GET() {
  const data = await loadRalexCategories();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
  });
}
