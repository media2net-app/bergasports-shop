import "server-only";

import { requirePrisma } from "@/lib/database";

export type AdminShippingRate = {
  id: string;
  countryCode: string;
  label: string;
  method: string;
  price: number;
  freeAbove: number | null;
  estimatedDays: string | null;
  active: boolean;
  sortOrder: number;
};

function toRate(row: {
  id: string;
  countryCode: string;
  label: string;
  method: string;
  price: { toString(): string } | number;
  freeAbove: { toString(): string } | number | null;
  estimatedDays: string | null;
  active: boolean;
  sortOrder: number;
}): AdminShippingRate {
  return {
    id: row.id,
    countryCode: row.countryCode,
    label: row.label,
    method: row.method,
    price: Number(row.price),
    freeAbove: row.freeAbove == null ? null : Number(row.freeAbove),
    estimatedDays: row.estimatedDays,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

export const DEFAULT_SHIPPING_SEED: Omit<AdminShippingRate, "id">[] = [
  {
    countryCode: "NL",
    method: "pickup",
    label: "Afhalen in Dedemsvaart",
    price: 0,
    freeAbove: null,
    estimatedDays: "Op afspraak",
    active: true,
    sortOrder: 0,
  },
  {
    countryCode: "NL",
    method: "standard",
    label: "Verzending Nederland",
    price: 6.95,
    freeAbove: null,
    estimatedDays: "1–3 werkdagen",
    active: true,
    sortOrder: 1,
  },
  {
    countryCode: "BE",
    method: "standard",
    label: "Verzending België",
    price: 12.95,
    freeAbove: null,
    estimatedDays: "2–4 werkdagen",
    active: true,
    sortOrder: 2,
  },
  {
    countryCode: "DE",
    method: "standard",
    label: "Verzending Duitsland",
    price: 14.95,
    freeAbove: null,
    estimatedDays: "2–5 werkdagen",
    active: true,
    sortOrder: 3,
  },
  {
    countryCode: "EU",
    method: "standard",
    label: "Verzending EU",
    price: 24.95,
    freeAbove: null,
    estimatedDays: "3–7 werkdagen",
    active: true,
    sortOrder: 4,
  },
];

export async function listAdminShippingRates(): Promise<AdminShippingRate[]> {
  const prisma = requirePrisma();
  const rows = await prisma.shippingRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { countryCode: "asc" }],
  });
  return rows.map(toRate);
}

export async function listActiveShippingRates(): Promise<AdminShippingRate[]> {
  const prisma = requirePrisma();
  const rows = await prisma.shippingRate.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { countryCode: "asc" }],
  });
  return rows.map(toRate);
}

export async function seedDefaultShippingRates(): Promise<AdminShippingRate[]> {
  const prisma = requirePrisma();
  const count = await prisma.shippingRate.count();
  if (count > 0) {
    return listAdminShippingRates();
  }
  await prisma.shippingRate.createMany({
    data: DEFAULT_SHIPPING_SEED.map((rate) => ({
      countryCode: rate.countryCode,
      label: rate.label,
      method: rate.method,
      price: rate.price,
      freeAbove: rate.freeAbove,
      estimatedDays: rate.estimatedDays,
      active: rate.active,
      sortOrder: rate.sortOrder,
    })),
  });
  return listAdminShippingRates();
}

export type ShippingRateWrite = {
  countryCode: string;
  label: string;
  method: string;
  price: number;
  freeAbove?: number | null;
  estimatedDays?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export async function createShippingRate(input: ShippingRateWrite): Promise<AdminShippingRate> {
  const countryCode = input.countryCode.trim().toUpperCase();
  const label = input.label.trim();
  const method = input.method.trim() || "standard";
  if (!countryCode || !label) {
    throw new Error("Land en label zijn verplicht.");
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("Vul een geldige prijs in.");
  }
  const prisma = requirePrisma();
  const row = await prisma.shippingRate.create({
    data: {
      countryCode,
      label,
      method,
      price: input.price,
      freeAbove: input.freeAbove != null && Number.isFinite(input.freeAbove) ? input.freeAbove : null,
      estimatedDays: input.estimatedDays?.trim() || null,
      active: input.active !== false,
      sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    },
  });
  return toRate(row);
}

export async function updateShippingRate(
  id: string,
  patch: Partial<ShippingRateWrite>,
): Promise<AdminShippingRate> {
  const prisma = requirePrisma();
  const data: {
    countryCode?: string;
    label?: string;
    method?: string;
    price?: number;
    freeAbove?: number | null;
    estimatedDays?: string | null;
    active?: boolean;
    sortOrder?: number;
  } = {};
  if (typeof patch.countryCode === "string") data.countryCode = patch.countryCode.trim().toUpperCase();
  if (typeof patch.label === "string") data.label = patch.label.trim();
  if (typeof patch.method === "string") data.method = patch.method.trim() || "standard";
  if (patch.price != null) {
    if (!Number.isFinite(patch.price) || patch.price < 0) throw new Error("Vul een geldige prijs in.");
    data.price = patch.price;
  }
  if (patch.freeAbove !== undefined) {
    data.freeAbove = patch.freeAbove != null && Number.isFinite(patch.freeAbove) ? patch.freeAbove : null;
  }
  if (patch.estimatedDays !== undefined) data.estimatedDays = patch.estimatedDays?.trim() || null;
  if (typeof patch.active === "boolean") data.active = patch.active;
  if (patch.sortOrder != null && Number.isFinite(patch.sortOrder)) data.sortOrder = patch.sortOrder;
  const row = await prisma.shippingRate.update({ where: { id }, data });
  return toRate(row);
}

export async function deleteShippingRate(id: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.shippingRate.delete({ where: { id } });
}
