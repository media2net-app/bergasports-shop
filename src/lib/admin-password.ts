import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { AdminRole } from "@/lib/admin-auth";
import { resolveAdminUserRole } from "@/lib/admin-users-db";

function verifyAdminPasswordEnv(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password.length !== expected.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(password, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

/** Controleert e-mail + wachtwoord (Prisma `admin_users`) met optionele legacy `ADMIN_PASSWORD`. */
export async function verifyAdminLogin(email: string, password: string): Promise<boolean> {
  return (await resolveAdminRoleOnLogin(email, password)) !== null;
}

/** Rol na succesvolle login (legacy env-login = `admin`). */
export async function resolveAdminRoleOnLogin(email: string, password: string): Promise<AdminRole | null> {
  const trimmedEmail = email.trim();
  if (trimmedEmail) {
    const role = await resolveAdminUserRole(trimmedEmail, password);
    if (role) {
      return role;
    }
  }
  if (!trimmedEmail && verifyAdminPasswordEnv(password)) {
    return "admin";
  }
  return null;
}
