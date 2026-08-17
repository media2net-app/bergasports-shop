import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { getPrisma } from "@/lib/prisma";

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;
export const CUSTOMER_COOKIE = "bs_customer_session";

function customerJwtSecret(): string | null {
  const s = process.env.ADMIN_JWT_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

export function hashCustomerPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyCustomerPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  const actual = scryptSync(password, salt, KEY_LEN, SCRYPT);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function createCustomerSessionToken(customerId: string, email: string): string | null {
  const secret = customerJwtSecret();
  if (!secret) return null;
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = b64url(Buffer.from(JSON.stringify({ sub: customerId, email, exp })));
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyCustomerSessionToken(
  token: string,
): { customerId: string; email: string } | null {
  const secret = customerJwtSecret();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const data = `${header}.${payload}`;
  const expected = createHmac("sha256", secret).update(data).digest();
  const actual = Buffer.from(sig, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      exp?: number;
    };
    if (!body.sub || !body.email || !body.exp || body.exp * 1000 < Date.now()) return null;
    return { customerId: body.sub, email: body.email };
  } catch {
    return null;
  }
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const prisma = getPrisma();
  if (!prisma) return { ok: false, error: "Database niet beschikbaar." };
  const email = input.email.trim().toLowerCase();
  if (!email || input.password.length < 8) {
    return { ok: false, error: "E-mail en wachtwoord (min. 8 tekens) verplicht." };
  }
  try {
    const row = await prisma.customer.create({
      data: {
        email,
        passwordHash: hashCustomerPassword(input.password),
        name: input.name?.trim() || null,
      },
    });
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "Dit e-mailadres is al in gebruik." };
  }
}

export async function loginCustomer(
  emailRaw: string,
  password: string,
): Promise<{ ok: true; id: string; email: string } | { ok: false; error: string }> {
  const prisma = getPrisma();
  if (!prisma) return { ok: false, error: "Database niet beschikbaar." };
  const email = emailRaw.trim().toLowerCase();
  const row = await prisma.customer.findUnique({ where: { email } });
  if (!row || !verifyCustomerPassword(password, row.passwordHash)) {
    return { ok: false, error: "Onjuiste e-mail of wachtwoord." };
  }
  return { ok: true, id: row.id, email: row.email };
}
