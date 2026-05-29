import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { buildEasySalesMappingCsv } from "@/lib/easy-sales-mapping-export";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const result = await buildEasySalesMappingCsv();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const filename = `easy-sales-mapping-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
