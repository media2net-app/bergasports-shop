import { SignJWT, jwtVerify } from "jose";

const COOKIE = "admin_session";

export type AdminRole = "admin" | "super_admin";

export type AdminSession = {
  role: AdminRole;
};

function getSecretKey() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 16) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export function isAdminAuthConfigured(): boolean {
  const jwtOk = Boolean(process.env.ADMIN_JWT_SECRET && process.env.ADMIN_JWT_SECRET.length >= 16);
  const dbOk = Boolean(process.env.DATABASE_URL?.trim());
  const legacyPw = Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
  return jwtOk && (dbOk || legacyPw);
}

function normalizeRole(role: unknown): AdminRole {
  return role === "super_admin" ? "super_admin" : "admin";
}

export async function createAdminSessionToken(role: AdminRole = "admin"): Promise<string | null> {
  const key = getSecretKey();
  if (!key) {
    return null;
  }
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .setIssuedAt()
    .sign(key);
}

export async function parseAdminSessionToken(token: string): Promise<AdminSession | null> {
  const key = getSecretKey();
  if (!key) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, key);
    return { role: normalizeRole(payload.role) };
  } catch {
    return null;
  }
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  return (await parseAdminSessionToken(token)) !== null;
}

export function isSuperAdminSession(session: AdminSession | null): boolean {
  return session?.role === "super_admin";
}

export function getAdminRoleLabel(session: AdminSession | null): string {
  return isSuperAdminSession(session) ? "Super admin" : "Admin";
}

export function adminSessionCookieName() {
  return COOKIE;
}
