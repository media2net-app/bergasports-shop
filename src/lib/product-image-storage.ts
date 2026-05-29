import "server-only";

import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { requirePrisma } from "@/lib/database";
import type { TrendyolJsonProduct, WcVariationJson } from "@/lib/products";

export const PRODUCT_IMAGES_BUCKET = "product-images";
const PUBLIC_SUBDIR = "product-images";

type MirrorResult = {
  publicUrl: string;
  storagePath: string;
  contentType: string;
  byteSize: number;
};

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function isHostedProductImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed, siteBaseUrl());
    if (parsed.pathname.startsWith(`/${PUBLIC_SUBDIR}/`)) {
      return true;
    }
    if (parsed.hostname.endsWith("bergasports.com") && parsed.pathname.includes("/product-images/")) {
      return true;
    }
    return false;
  } catch {
    return trimmed.startsWith(`/${PUBLIC_SUBDIR}/`);
  }
}

export function shouldMirrorProductImageUrl(url: string | undefined | null): boolean {
  const trimmed = url?.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  return !isHostedProductImageUrl(trimmed);
}

function hashSourceUrl(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex");
}

function extensionFromMime(contentType: string | null, sourceUrl: string): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("avif")) return "avif";
  try {
    const ext = new URL(sourceUrl).pathname.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
      return ext === "jpeg" ? "jpg" : ext;
    }
  } catch {
    /* ignore */
  }
  return "jpg";
}

function storagePathForUrl(sourceUrl: string, ext: string): string {
  const hash = hashSourceUrl(sourceUrl);
  return `mirror/${hash.slice(0, 2)}/${hash}.${ext}`;
}

/** Relatief pad — werkt op localhost én productie zonder URL-rewrite. */
function publicUrlForPath(storagePath: string): string {
  return `/${PUBLIC_SUBDIR}/${storagePath}`;
}

async function getCachedMirror(sourceUrl: string): Promise<string | null> {
  const prisma = requirePrisma();
  const row = await prisma.productImageAsset.findUnique({
    where: { sourceUrl: sourceUrl.trim() },
    select: { publicUrl: true },
  });
  return row?.publicUrl ?? null;
}

async function saveCachedMirror(sourceUrl: string, result: MirrorResult): Promise<void> {
  const prisma = requirePrisma();
  await prisma.productImageAsset.upsert({
    where: { sourceUrl: sourceUrl.trim() },
    create: {
      sourceUrl: sourceUrl.trim(),
      storagePath: result.storagePath,
      publicUrl: result.publicUrl,
      contentType: result.contentType,
      byteSize: result.byteSize,
    },
    update: {
      storagePath: result.storagePath,
      publicUrl: result.publicUrl,
      contentType: result.contentType,
      byteSize: result.byteSize,
    },
  });
}

async function downloadImage(sourceUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(sourceUrl.trim(), {
    headers: {
      Accept: "image/*",
      "User-Agent": "Bergasports-ImageMirror/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`Download ${res.status}: ${sourceUrl}`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 32) {
    throw new Error(`Download te klein: ${sourceUrl}`);
  }
  return { buffer, contentType };
}

async function uploadMirror(sourceUrl: string, buffer: Buffer, contentType: string): Promise<MirrorResult> {
  const ext = extensionFromMime(contentType, sourceUrl);
  const storagePath = storagePathForUrl(sourceUrl, ext);
  const filePath = path.join(process.cwd(), "public", PUBLIC_SUBDIR, storagePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return {
    publicUrl: publicUrlForPath(storagePath),
    storagePath,
    contentType,
    byteSize: buffer.length,
  };
}

export async function mirrorProductImageUrl(sourceUrl: string): Promise<string> {
  const trimmed = sourceUrl.trim();
  if (!shouldMirrorProductImageUrl(trimmed)) {
    return trimmed;
  }

  const cached = await getCachedMirror(trimmed);
  if (cached) {
    return cached;
  }

  const { buffer, contentType } = await downloadImage(trimmed);
  const uploaded = await uploadMirror(trimmed, buffer, contentType);
  await saveCachedMirror(trimmed, uploaded);
  return uploaded.publicUrl;
}

function collectProductImageUrls(product: TrendyolJsonProduct): string[] {
  const urls = new Set<string>();
  if (product.image?.trim()) {
    urls.add(product.image.trim());
  }
  for (const img of product.images ?? []) {
    if (img?.trim()) {
      urls.add(img.trim());
    }
  }
  for (const v of product.wcVariations ?? []) {
    if (v.image?.trim()) {
      urls.add(v.image.trim());
    }
  }
  return [...urls];
}

function replaceUrlInList(list: string[] | undefined, map: Map<string, string>): string[] | undefined {
  if (!list?.length) {
    return list;
  }
  return list.map((url) => map.get(url.trim()) ?? url);
}

function replaceVariations(
  variations: WcVariationJson[] | undefined,
  map: Map<string, string>,
): WcVariationJson[] | undefined {
  if (!variations?.length) {
    return variations;
  }
  let changed = false;
  const next = variations.map((v) => {
    const img = v.image?.trim();
    if (!img) {
      return v;
    }
    const replacement = map.get(img);
    if (!replacement || replacement === img) {
      return v;
    }
    changed = true;
    return { ...v, image: replacement };
  });
  return changed ? next : variations;
}

export async function mirrorProductImagesIfNeeded(
  product: TrendyolJsonProduct,
): Promise<{ product: TrendyolJsonProduct; changed: boolean; mirroredCount: number }> {
  const sources = collectProductImageUrls(product).filter(shouldMirrorProductImageUrl);
  if (!sources.length) {
    return { product, changed: false, mirroredCount: 0 };
  }

  const map = new Map<string, string>();
  for (const source of sources) {
    try {
      map.set(source, await mirrorProductImageUrl(source));
    } catch (e) {
      console.error("[product-image-storage]", product.id, source, e);
    }
  }

  if (!map.size) {
    return { product, changed: false, mirroredCount: 0 };
  }

  const nextImage = product.image?.trim() ? map.get(product.image.trim()) ?? product.image : product.image;
  const nextImages = replaceUrlInList(product.images, map);
  const nextVariations = replaceVariations(product.wcVariations, map);

  const changed =
    nextImage !== product.image ||
    nextImages !== product.images ||
    nextVariations !== product.wcVariations;

  if (!changed) {
    return { product, changed: false, mirroredCount: map.size };
  }

  return {
    product: {
      ...product,
      image: nextImage ?? product.image,
      images: nextImages,
      wcVariations: nextVariations,
    },
    changed: true,
    mirroredCount: map.size,
  };
}
