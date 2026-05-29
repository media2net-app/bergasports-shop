const HOSTED_PATH = "/product-images/";

/** True when URL can be optimized via next/image (local or site-hosted product images). */
export function isOptimizableProductImageUrl(url: string | undefined | null): boolean {
  const t = url?.trim();
  if (!t || t.startsWith("data:") || t.startsWith("blob:")) {
    return false;
  }
  if (t.startsWith(HOSTED_PATH)) {
    return true;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return false;
    }
    return u.pathname.includes(HOSTED_PATH);
  } catch {
    return false;
  }
}
