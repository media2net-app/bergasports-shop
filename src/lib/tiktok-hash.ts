import { createHash } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizePhoneForHash(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("40")) return digits;
  if (digits.startsWith("0")) return `4${digits}`;
  return digits;
}

export function hashEmail(email: string | undefined | null): string | undefined {
  const v = email?.trim().toLowerCase();
  if (!v) return undefined;
  return sha256Hex(v);
}

export function hashPhone(phone: string | undefined | null): string | undefined {
  if (!phone?.trim()) return undefined;
  const norm = normalizePhoneForHash(phone);
  if (!norm) return undefined;
  return sha256Hex(norm);
}

export function hashExternalId(id: string | undefined | null): string | undefined {
  const v = id?.trim();
  if (!v) return undefined;
  return sha256Hex(v);
}
