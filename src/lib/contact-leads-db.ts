import "server-only";

import { getPrisma } from "@/lib/prisma";

export type ContactLeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  kind: string;
  preferredDate: string | null;
  status: string;
  createdAt: Date;
};

export async function createContactLead(input: {
  name: string;
  email: string;
  phone?: string;
  message: string;
  kind?: "contact" | "appointment" | "lafuga";
  preferredDate?: string;
}): Promise<ContactLeadRow> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  return prisma.contactLead.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      message: input.message.trim(),
      kind: input.kind ?? "contact",
      preferredDate: input.preferredDate?.trim() || null,
    },
  });
}

export async function listContactLeads(): Promise<ContactLeadRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.contactLead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

export async function countNewContactLeads(): Promise<number> {
  const prisma = getPrisma();
  if (!prisma) return 0;
  try {
    return await prisma.contactLead.count({ where: { status: "new" } });
  } catch {
    return 0;
  }
}

export async function setContactLeadStatus(id: string, status: "new" | "handled"): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  await prisma.contactLead.update({ where: { id }, data: { status } });
}
