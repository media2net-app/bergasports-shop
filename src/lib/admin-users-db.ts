import "server-only";

import type { AdminRole } from "@/lib/admin-auth";
import { verifyAdminPasswordHash } from "@/lib/admin-password-hash";
import { getPrisma } from "@/lib/prisma";

export type AdminUserListRow = {
  email: string;
  role: AdminRole;
  created_at: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRole(role: string | null | undefined): AdminRole {
  return role === "super_admin" ? "super_admin" : "admin";
}

function prismaClient() {
  const client = getPrisma();
  if (!client) {
    throw new Error("DATABASE_URL ontbreekt.");
  }
  return client;
}

export async function verifyAdminUserCredentials(email: string, password: string): Promise<boolean> {
  return (await resolveAdminUserRole(email, password)) !== null;
}

export async function resolveAdminUserRole(email: string, password: string): Promise<AdminRole | null> {
  const prisma = getPrisma();
  if (!prisma) {
    return null;
  }
  const normalized = normalizeEmail(email);
  const row = await prisma.adminUser.findUnique({
    where: { email: normalized },
    select: { passwordHash: true, role: true },
  });
  if (!row?.passwordHash) {
    return null;
  }
  const valid = await verifyAdminPasswordHash(password, row.passwordHash);
  if (!valid) {
    return null;
  }
  return normalizeRole(row.role);
}

export async function listAdminUsers(): Promise<AdminUserListRow[]> {
  const prisma = prismaClient();
  const rows = await prisma.adminUser.findMany({
    select: { email: true, role: true, createdAt: true },
    orderBy: { email: "asc" },
  });
  return rows.map((row) => ({
    email: row.email,
    role: normalizeRole(row.role),
    created_at: row.createdAt.toISOString(),
  }));
}

export async function upsertAdminUser(
  email: string,
  password: string,
  role: AdminRole = "admin",
): Promise<void> {
  const { hashAdminPassword } = await import("@/lib/admin-password-hash");
  const prisma = prismaClient();
  const normalized = normalizeEmail(email);
  const passwordHash = hashAdminPassword(password);
  await prisma.adminUser.upsert({
    where: { email: normalized },
    create: { email: normalized, passwordHash, role },
    update: { passwordHash, role },
  });
}

export async function setAdminUserRole(email: string, role: AdminRole): Promise<void> {
  const prisma = prismaClient();
  const normalized = normalizeEmail(email);
  await prisma.adminUser.update({
    where: { email: normalized },
    data: { role },
  });
}

export async function deleteAdminUser(email: string): Promise<void> {
  const prisma = prismaClient();
  const normalized = normalizeEmail(email);
  await prisma.adminUser.delete({
    where: { email: normalized },
  });
}
