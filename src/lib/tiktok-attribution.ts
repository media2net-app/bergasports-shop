export const TIKTOK_TTCLID_COOKIE = "ttclid";
export const TIKTOK_TTCLID_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function readTtclidFromCookieString(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === TIKTOK_TTCLID_COOKIE) {
      const value = rest.join("=").trim();
      return value || null;
    }
  }
  return null;
}
