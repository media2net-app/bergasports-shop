import "server-only";

import { put } from "@vercel/blob";
import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type AdminMediaUploadResult = {
  url: string;
  pathname: string;
  contentType: string;
  byteSize: number;
};

function extensionFor(contentType: string, filename: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "jpg";
}

function normalizeContentType(raw: string | undefined, filename: string): string {
  const ct = (raw ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (ALLOWED_TYPES.has(ct)) {
    return ct;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "";
}

export function assertAdminImageFile(file: File): { contentType: string } {
  if (!file || typeof file.size !== "number") {
    throw new Error("Geen bestand ontvangen.");
  }
  if (file.size <= 0) {
    throw new Error("Leeg bestand.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Bestand te groot (max 8 MB).");
  }
  const contentType = normalizeContentType(file.type, file.name || "upload.jpg");
  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    throw new Error("Alleen JPG, PNG, WebP of GIF toegestaan.");
  }
  return { contentType };
}

export async function uploadAdminImageBuffer(input: {
  buffer: Buffer;
  contentType: string;
  filename: string;
  folder?: "products" | "pages" | "uploads";
}): Promise<AdminMediaUploadResult> {
  const folder = input.folder ?? "uploads";
  const ext = extensionFor(input.contentType, input.filename);
  const hash = createHash("sha256").update(input.buffer).digest("hex").slice(0, 16);
  const rand = randomBytes(4).toString("hex");
  const pathname = `media/${folder}/${hash}-${rand}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, input.buffer, {
      access: "public",
      contentType: input.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: input.contentType,
      byteSize: input.buffer.length,
    };
  }

  const filePath = path.join(process.cwd(), "public", pathname);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.buffer);
  return {
    url: `/${pathname}`,
    pathname,
    contentType: input.contentType,
    byteSize: input.buffer.length,
  };
}

export async function uploadAdminImageFile(
  file: File,
  folder: "products" | "pages" | "uploads" = "uploads",
): Promise<AdminMediaUploadResult> {
  const { contentType } = assertAdminImageFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadAdminImageBuffer({
    buffer,
    contentType,
    filename: file.name || "upload.jpg",
    folder,
  });
}
