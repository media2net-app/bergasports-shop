import type { PrismaClient } from "@/generated/prisma/client";

import {
  attributeSlugFromName,
  attributeTermSlugFromName,
  type ShopAttribute,
  type ShopAttributeTerm,
} from "@/lib/attributes-shared";
import {
  decodeHtmlEntities,
  stripHtml,
  type WcRestAttributeTerm,
  type WcRestGlobalAttribute,
} from "@/lib/wordpress-import-shared";

export type WooAttributeBundle = {
  attr: WcRestGlobalAttribute;
  terms: WcRestAttributeTerm[];
};

export type AttributeUpsertCounts = {
  created: number;
  updated: number;
  skipped: number;
  termsByAttrId: Map<number, string[]>;
};

type AttributeRow = {
  id: number;
  name: string;
  slug: string;
  type: string;
  orderBy: string | null;
  hasArchives: boolean;
  sortOrder: number;
};

type TermRow = {
  id: number;
  attributeId: number;
  name: string;
  slug: string;
  menuOrder: number;
};

export function toShopAttributeTerm(row: TermRow): ShopAttributeTerm {
  return {
    id: row.id,
    attributeId: row.attributeId,
    name: row.name,
    slug: row.slug,
    menuOrder: row.menuOrder,
  };
}

export function toShopAttribute(row: AttributeRow, terms: TermRow[] = []): ShopAttribute {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    orderBy: row.orderBy,
    hasArchives: row.hasArchives,
    sortOrder: row.sortOrder,
    terms: terms
      .slice()
      .sort((a, b) => a.menuOrder - b.menuOrder || a.name.localeCompare(b.name, "nl"))
      .map(toShopAttributeTerm),
  };
}

function normalizeAttrSlug(raw: string | undefined, name: string, id: number): string {
  const fromWc = raw?.trim().toLowerCase() || "";
  if (fromWc) return fromWc;
  const base = attributeSlugFromName(name);
  return base || `pa-attr-${id}`;
}

function normalizeTermSlug(raw: string | undefined, name: string, id: number): string {
  const fromWc = raw?.trim().toLowerCase() || "";
  if (fromWc) return fromWc;
  const base = attributeTermSlugFromName(name);
  return base || `term-${id}`;
}

async function ensureUniqueAttributeSlug(
  prisma: PrismaClient,
  slug: string,
  exceptId?: number,
): Promise<string> {
  let candidate = slug;
  let n = 2;
  for (;;) {
    const hit = await prisma.productAttribute.findUnique({ where: { slug: candidate } });
    if (!hit || hit.id === exceptId) return candidate;
    candidate = `${slug}-${n}`;
    n += 1;
  }
}

async function ensureUniqueTermSlug(
  prisma: PrismaClient,
  attributeId: number,
  slug: string,
  exceptId?: number,
): Promise<string> {
  let candidate = slug;
  let n = 2;
  for (;;) {
    const hit = await prisma.productAttributeTerm.findFirst({
      where: { attributeId, slug: candidate },
    });
    if (!hit || hit.id === exceptId) return candidate;
    candidate = `${slug}-${n}`;
    n += 1;
  }
}

/** Upsert WC globale attributen + termen; vult termsByAttrId voor productmapping. */
export async function upsertWooGlobalAttributes(
  prisma: PrismaClient,
  bundles: WooAttributeBundle[],
  options?: { dryRun?: boolean },
): Promise<AttributeUpsertCounts> {
  const counts: AttributeUpsertCounts = {
    created: 0,
    updated: 0,
    skipped: 0,
    termsByAttrId: new Map(),
  };

  for (const { attr, terms } of bundles) {
    if (!attr.id) {
      counts.skipped += 1;
      continue;
    }
    const name = decodeHtmlEntities(stripHtml(attr.name || attr.slug || `Attribuut ${attr.id}`)).trim();
    const slug = normalizeAttrSlug(attr.slug, name, attr.id);
    const type = (attr.type || "select").trim() || "select";
    const orderBy = attr.order_by?.trim() || null;
    const hasArchives = Boolean(attr.has_archives);
    const termNames = terms
      .map((term) => decodeHtmlEntities(stripHtml(term.name || term.slug || "")).trim())
      .filter(Boolean);
    counts.termsByAttrId.set(attr.id, termNames);

    if (options?.dryRun) {
      const existing = await prisma.productAttribute.findUnique({ where: { id: attr.id } });
      if (existing) counts.updated += 1;
      else counts.created += 1;
      continue;
    }

    const uniqueSlug = await ensureUniqueAttributeSlug(prisma, slug, attr.id);
    const existing = await prisma.productAttribute.findUnique({ where: { id: attr.id } });
    if (existing) {
      const changed =
        existing.name !== name ||
        existing.slug !== uniqueSlug ||
        existing.type !== type ||
        (existing.orderBy || null) !== orderBy ||
        existing.hasArchives !== hasArchives;
      if (changed) {
        await prisma.productAttribute.update({
          where: { id: attr.id },
          data: { name, slug: uniqueSlug, type, orderBy, hasArchives },
        });
        counts.updated += 1;
      } else {
        counts.skipped += 1;
      }
    } else {
      await prisma.productAttribute.create({
        data: {
          id: attr.id,
          name,
          slug: uniqueSlug,
          type,
          orderBy,
          hasArchives,
          sortOrder: 0,
        },
      });
      counts.created += 1;
    }

    for (let i = 0; i < terms.length; i += 1) {
      const term = terms[i]!;
      if (!term.id) continue;
      const termName = decodeHtmlEntities(stripHtml(term.name || term.slug || `Term ${term.id}`)).trim();
      const termSlug = await ensureUniqueTermSlug(
        prisma,
        attr.id,
        normalizeTermSlug(term.slug, termName, term.id),
        term.id,
      );
      const menuOrder = typeof term.menu_order === "number" ? term.menu_order : i;
      await prisma.productAttributeTerm.upsert({
        where: { id: term.id },
        create: {
          id: term.id,
          attributeId: attr.id,
          name: termName,
          slug: termSlug,
          menuOrder,
        },
        update: {
          attributeId: attr.id,
          name: termName,
          slug: termSlug,
          menuOrder,
        },
      });
    }
  }

  return counts;
}

export async function nextAttributeId(prisma: PrismaClient): Promise<number> {
  const agg = await prisma.productAttribute.aggregate({ _max: { id: true } });
  return Math.max(1, (agg._max.id ?? 0) + 1);
}

export async function nextAttributeTermId(prisma: PrismaClient): Promise<number> {
  const agg = await prisma.productAttributeTerm.aggregate({ _max: { id: true } });
  return Math.max(1, (agg._max.id ?? 0) + 1);
}

export { ensureUniqueAttributeSlug, ensureUniqueTermSlug };
