import "server-only";

import { revalidatePath } from "next/cache";

import {
  attributeSlugFromName,
  attributeTermSlugFromName,
  type ShopAttribute,
  type ShopAttributeTerm,
} from "@/lib/attributes-shared";
import {
  ensureUniqueAttributeSlug,
  ensureUniqueTermSlug,
  nextAttributeId,
  nextAttributeTermId,
  toShopAttribute,
} from "@/lib/attributes-write";
import { requirePrisma } from "@/lib/database";

function invalidateAttributePages() {
  revalidatePath("/admin/attributes");
  revalidatePath("/admin/products");
}

export async function listAdminAttributes(): Promise<ShopAttribute[]> {
  const prisma = requirePrisma();
  const rows = await prisma.productAttribute.findMany({
    include: { terms: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => toShopAttribute(row, row.terms));
}

export type AttributeWriteInput = {
  name: string;
  slug?: string;
  type?: string;
  orderBy?: string | null;
  hasArchives?: boolean;
  sortOrder?: number;
  terms?: { name: string; slug?: string; menuOrder?: number }[];
};

export type AttributeTermWriteInput = {
  name: string;
  slug?: string;
  menuOrder?: number;
};

export async function createAdminAttribute(input: AttributeWriteInput): Promise<ShopAttribute> {
  const name = input.name.trim();
  if (!name) throw new Error("Naam is verplicht.");
  const prisma = requirePrisma();
  const id = await nextAttributeId(prisma);
  const slug = await ensureUniqueAttributeSlug(
    prisma,
    (input.slug?.trim() && attributeSlugFromName(input.slug)) || attributeSlugFromName(name),
  );
  try {
    const row = await prisma.productAttribute.create({
      data: {
        id,
        name,
        slug,
        type: (input.type?.trim() || "select").slice(0, 40),
        orderBy: input.orderBy?.trim() || null,
        hasArchives: Boolean(input.hasArchives),
        sortOrder: Number.isFinite(input.sortOrder) ? Math.floor(input.sortOrder!) : 0,
      },
    });
    const terms: ShopAttributeTerm[] = [];
    if (input.terms?.length) {
      for (let i = 0; i < input.terms.length; i += 1) {
        const t = input.terms[i]!;
        const termName = t.name.trim();
        if (!termName) continue;
        const termId = await nextAttributeTermId(prisma);
        const termSlug = await ensureUniqueTermSlug(
          prisma,
          id,
          (t.slug?.trim() && attributeTermSlugFromName(t.slug)) || attributeTermSlugFromName(termName),
        );
        const created = await prisma.productAttributeTerm.create({
          data: {
            id: termId,
            attributeId: id,
            name: termName,
            slug: termSlug,
            menuOrder: Number.isFinite(t.menuOrder) ? Math.floor(t.menuOrder!) : i,
          },
        });
        terms.push({
          id: created.id,
          attributeId: created.attributeId,
          name: created.name,
          slug: created.slug,
          menuOrder: created.menuOrder,
        });
      }
    }
    invalidateAttributePages();
    return toShopAttribute(row, terms);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Deze slug bestaat al.");
    }
    throw e;
  }
}

export async function updateAdminAttribute(
  id: number,
  input: Partial<AttributeWriteInput>,
): Promise<ShopAttribute> {
  if (!Number.isFinite(id) || id <= 0) throw new Error("Ongeldige id.");
  const prisma = requirePrisma();
  const existing = await prisma.productAttribute.findUnique({
    where: { id },
    include: { terms: true },
  });
  if (!existing) throw new Error("Attribuut niet gevonden.");
  const name = input.name != null ? input.name.trim() : existing.name;
  if (!name) throw new Error("Naam is verplicht.");
  const slug =
    input.slug != null
      ? await ensureUniqueAttributeSlug(prisma, attributeSlugFromName(input.slug) || existing.slug, id)
      : existing.slug;
  try {
    const row = await prisma.productAttribute.update({
      where: { id },
      data: {
        name,
        slug,
        type: input.type != null ? (input.type.trim() || existing.type).slice(0, 40) : existing.type,
        orderBy: input.orderBy === undefined ? existing.orderBy : input.orderBy?.trim() || null,
        hasArchives: input.hasArchives ?? existing.hasArchives,
        sortOrder:
          input.sortOrder == null || !Number.isFinite(input.sortOrder)
            ? existing.sortOrder
            : Math.floor(input.sortOrder),
      },
      include: { terms: true },
    });
    invalidateAttributePages();
    return toShopAttribute(row, row.terms);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Deze slug bestaat al.");
    }
    throw e;
  }
}

export async function deleteAdminAttribute(id: number): Promise<void> {
  if (!Number.isFinite(id) || id <= 0) throw new Error("Ongeldige id.");
  const prisma = requirePrisma();
  try {
    await prisma.productAttribute.delete({ where: { id } });
  } catch {
    throw new Error("Attribuut niet gevonden.");
  }
  invalidateAttributePages();
}

export async function createAdminAttributeTerm(
  attributeId: number,
  input: AttributeTermWriteInput,
): Promise<ShopAttributeTerm> {
  if (!Number.isFinite(attributeId) || attributeId <= 0) throw new Error("Ongeldige attribuut-id.");
  const name = input.name.trim();
  if (!name) throw new Error("Naam is verplicht.");
  const prisma = requirePrisma();
  const attr = await prisma.productAttribute.findUnique({ where: { id: attributeId } });
  if (!attr) throw new Error("Attribuut niet gevonden.");
  const id = await nextAttributeTermId(prisma);
  const slug = await ensureUniqueTermSlug(
    prisma,
    attributeId,
    (input.slug?.trim() && attributeTermSlugFromName(input.slug)) || attributeTermSlugFromName(name),
  );
  try {
    const row = await prisma.productAttributeTerm.create({
      data: {
        id,
        attributeId,
        name,
        slug,
        menuOrder: Number.isFinite(input.menuOrder) ? Math.floor(input.menuOrder!) : 0,
      },
    });
    invalidateAttributePages();
    return {
      id: row.id,
      attributeId: row.attributeId,
      name: row.name,
      slug: row.slug,
      menuOrder: row.menuOrder,
    };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Deze term-slug bestaat al voor dit attribuut.");
    }
    throw e;
  }
}

export async function updateAdminAttributeTerm(
  attributeId: number,
  termId: number,
  input: Partial<AttributeTermWriteInput>,
): Promise<ShopAttributeTerm> {
  if (!Number.isFinite(attributeId) || attributeId <= 0) throw new Error("Ongeldige attribuut-id.");
  if (!Number.isFinite(termId) || termId <= 0) throw new Error("Ongeldige term-id.");
  const prisma = requirePrisma();
  const existing = await prisma.productAttributeTerm.findFirst({
    where: { id: termId, attributeId },
  });
  if (!existing) throw new Error("Term niet gevonden.");
  const name = input.name != null ? input.name.trim() : existing.name;
  if (!name) throw new Error("Naam is verplicht.");
  const slug =
    input.slug != null
      ? await ensureUniqueTermSlug(
          prisma,
          attributeId,
          attributeTermSlugFromName(input.slug) || existing.slug,
          termId,
        )
      : existing.slug;
  try {
    const row = await prisma.productAttributeTerm.update({
      where: { id: termId },
      data: {
        name,
        slug,
        menuOrder:
          input.menuOrder == null || !Number.isFinite(input.menuOrder)
            ? existing.menuOrder
            : Math.floor(input.menuOrder),
      },
    });
    invalidateAttributePages();
    return {
      id: row.id,
      attributeId: row.attributeId,
      name: row.name,
      slug: row.slug,
      menuOrder: row.menuOrder,
    };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Deze term-slug bestaat al voor dit attribuut.");
    }
    throw e;
  }
}

export async function deleteAdminAttributeTerm(attributeId: number, termId: number): Promise<void> {
  if (!Number.isFinite(attributeId) || attributeId <= 0) throw new Error("Ongeldige attribuut-id.");
  if (!Number.isFinite(termId) || termId <= 0) throw new Error("Ongeldige term-id.");
  const prisma = requirePrisma();
  const existing = await prisma.productAttributeTerm.findFirst({
    where: { id: termId, attributeId },
  });
  if (!existing) throw new Error("Term niet gevonden.");
  await prisma.productAttributeTerm.delete({ where: { id: termId } });
  invalidateAttributePages();
}
