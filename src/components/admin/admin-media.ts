export type MediaAssetClient = {
  id: string;
  url: string;
  pathname: string;
  filename: string;
  alt: string | null;
  contentType: string | null;
  byteSize: number | null;
  folder: string;
  createdAt: string;
};

export type AdminUploadFolder = "products" | "pages" | "uploads";

const FOLDER_LABELS: Record<string, string> = {
  uploads: "Uploads",
  products: "Producten",
  pages: "Pagina's",
  news: "Nieuws",
};

export function folderLabel(folder: string) {
  return FOLDER_LABELS[folder] ?? folder;
}

export function formatBytes(bytes: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}

export function formatMediaDate(iso: string, withTime = false): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(
    "nl-NL",
    withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" },
  );
}

export function typeLabel(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }
  const subtype = contentType.split("/")[1]?.split("+")[0]?.toLowerCase();
  if (subtype === "jpeg" || subtype === "jpg") return "JPEG";
  if (subtype === "png") return "PNG";
  if (subtype === "webp") return "WebP";
  if (subtype === "gif") return "GIF";
  if (subtype === "svg+xml" || subtype === "svg") return "SVG";
  return contentType;
}

export function metaBits(asset: MediaAssetClient, withTime = false): string[] {
  const bits: string[] = [];
  const type = typeLabel(asset.contentType);
  const size = formatBytes(asset.byteSize);
  const date = formatMediaDate(asset.createdAt, withTime);
  if (type) bits.push(type);
  if (size) bits.push(size);
  if (date) bits.push(date);
  return bits;
}

export function uniqueFolders(assets: MediaAssetClient[]): string[] {
  const unique = [...new Set(assets.map((asset) => asset.folder).filter(Boolean))];
  unique.sort((a, b) => folderLabel(a).localeCompare(folderLabel(b), "nl"));
  return unique;
}

export function filterMediaAssets(assets: MediaAssetClient[], query: string, folder: string): MediaAssetClient[] {
  const q = query.trim().toLowerCase();
  return assets.filter((asset) => {
    if (folder && asset.folder !== folder) {
      return false;
    }
    if (!q) {
      return true;
    }
    return asset.filename.toLowerCase().includes(q);
  });
}

export function optimisticMediaAsset(url: string, folder = "uploads"): MediaAssetClient {
  const now = new Date().toISOString();
  return {
    id: `local-${now}-${url}`,
    url,
    pathname: url,
    filename: url.split("/").pop() ?? "upload",
    alt: null,
    contentType: null,
    byteSize: null,
    folder,
    createdAt: now,
  };
}

export function mergeMediaAlts(
  prev: Record<string, string>,
  assets: MediaAssetClient[],
): Record<string, string> {
  const next = { ...prev };
  for (const asset of assets) {
    if (!(asset.id in next)) {
      next[asset.id] = asset.alt ?? "";
    }
  }
  return next;
}
