import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { uploadAdminImageFile } from "@/lib/admin-media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Verwacht form-veld 'file'." }, { status: 400 });
    }
    const folderRaw = String(form.get("folder") ?? "uploads");
    const folder =
      folderRaw === "products" || folderRaw === "pages" || folderRaw === "news" || folderRaw === "uploads"
        ? folderRaw
        : ("uploads" as const);

    const uploaded = await uploadAdminImageFile(file, folder === "news" ? "uploads" : folder);
    const { recordMediaAsset } = await import("@/lib/media-assets-db");
    await recordMediaAsset({
      url: uploaded.url,
      pathname: uploaded.pathname,
      filename: file.name || uploaded.pathname,
      contentType: uploaded.contentType,
      byteSize: uploaded.byteSize,
      folder,
      alt: String(form.get("alt") ?? "").trim() || null,
    });
    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      pathname: uploaded.pathname,
      contentType: uploaded.contentType,
      byteSize: uploaded.byteSize,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload mislukt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
