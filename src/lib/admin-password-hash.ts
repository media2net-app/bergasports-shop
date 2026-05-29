import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_LEN = 64;

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyAdminPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const salt = Buffer.from(parts[1]!, "base64");
  const expected = Buffer.from(parts[2]!, "base64");
  try {
    const actual = scryptSync(password, salt, expected.length, SCRYPT);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
