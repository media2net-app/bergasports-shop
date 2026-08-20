import { NextResponse } from "next/server";

import { loadRalexCategories } from "@/lib/categories-db";
import { visiblePublicNavTree } from "@/lib/shop-nav-tree";

export async function GET() {
  const data = await loadRalexCategories();
  const tree = visiblePublicNavTree(data.tree);
  return NextResponse.json(
    { ...data, tree },
    {
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    },
  );
}
