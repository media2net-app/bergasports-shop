import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { testOpenAiConnection } from "@/lib/openai-admin-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — probe OpenAI auth with the saved key (never returns the secret). */
export async function POST() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const result = await testOpenAiConnection();
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        label: "Fout",
        detail: e instanceof Error ? e.message : "Test mislukt",
      },
      { status: 500 },
    );
  }
}
