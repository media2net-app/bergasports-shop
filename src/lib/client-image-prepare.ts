/** Browser-only helpers: normalize iPhone HEIC and other uploads to JPEG data URLs. */

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

const FORMAT_ERROR_RO =
  "Formatul fotografiei nu poate fi citit. Încearcă din Galerie sau pe iPhone: Setări → Cameră → Formate → Compatibilitate maximă.";

export const IMAGE_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,image/*";

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(FORMAT_ERROR_RO));
    };
    reader.onerror = () => reject(new Error(FORMAT_ERROR_RO));
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const m = /^data:image\/[\w+.-]+;base64,(.+)$/i.exec(dataUrl);
  if (!m) return 0;
  return Math.floor((m[1].length * 3) / 4);
}

function drawToJpegDataUrl(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
  quality: number,
): string {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(FORMAT_ERROR_RO);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

async function rasterizeFileToJpeg(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      try {
        return drawToJpegDataUrl(bitmap, bitmap.width, bitmap.height, maxEdge, quality);
      } finally {
        bitmap.close();
      }
    } catch {
      /* fallback below */
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  return rasterizeDataUrlToJpeg(dataUrl, maxEdge, quality);
}

function rasterizeDataUrlToJpeg(dataUrl: string, maxEdge: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(drawToJpegDataUrl(img, img.naturalWidth, img.naturalHeight, maxEdge, quality));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(FORMAT_ERROR_RO));
      }
    };
    img.onerror = () => reject(new Error(FORMAT_ERROR_RO));
    img.src = dataUrl;
  });
}

/**
 * Converts camera/gallery uploads (incl. iPhone HEIC) to a JPEG data URL for APIs.
 */
export async function prepareImageDataUrlForUpload(
  file: File,
  options?: { maxBytes?: number; maxEdge?: number },
): Promise<string> {
  const maxBytes = options?.maxBytes ?? 6 * 1024 * 1024;
  const maxEdge = options?.maxEdge ?? 2048;

  if (!isLikelyImageFile(file)) {
    throw new Error("Te rugăm să alegi o imagine (JPG, PNG, WebP sau poză iPhone).");
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Imaginea este prea mare (max. 25 MB la încărcare).");
  }

  let quality = 0.9;
  let edge = maxEdge;
  let jpeg = await rasterizeFileToJpeg(file, edge, quality);

  for (let attempt = 0; attempt < 6 && estimateDataUrlBytes(jpeg) > maxBytes; attempt++) {
    quality = Math.max(0.55, quality - 0.08);
    edge = Math.max(1024, Math.round(edge * 0.85));
    jpeg = await rasterizeDataUrlToJpeg(jpeg, edge, quality);
  }

  if (estimateDataUrlBytes(jpeg) > maxBytes) {
    throw new Error("Fotografia este prea mare după comprimare. Încearcă o poză mai mică.");
  }

  if (!jpeg.startsWith("data:image/jpeg")) {
    throw new Error(FORMAT_ERROR_RO);
  }

  return jpeg;
}
