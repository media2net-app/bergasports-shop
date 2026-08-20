import "server-only";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import type {
  AdminCustomerAddress,
  AdminCustomerAddressWrite,
  AdminCustomerDetail,
  AdminCustomerDirectoryQuery,
  AdminCustomerDirectoryResult,
  AdminCustomerKindFilter,
  AdminCustomerListItem,
} from "@/lib/admin-customer-types";
import { hashCustomerPassword } from "@/lib/customer-auth";
import { requirePrisma } from "@/lib/database";

export type {
  AdminCustomerAddress,
  AdminCustomerAddressWrite,
  AdminCustomerDetail,
  AdminCustomerDirectoryQuery,
  AdminCustomerDirectoryResult,
  AdminCustomerKindFilter,
  AdminCustomerListItem,
} from "@/lib/admin-customer-types";

function mapAddress(row: {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  isDefault: boolean;
}): AdminCustomerAddress {
  return {
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    isDefault: row.isDefault,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

type OrderAgg = {
  count: number;
  total: number;
  currency: string;
  lastAt: string;
  lastNumber: string;
  lastId: number;
  name: string;
  phone: string;
  city: string;
};

function pickCity(
  addresses: Array<{ city: string; isDefault: boolean }>,
  fallback?: string | null,
): string | null {
  const fromAddress =
    addresses.find((address) => address.isDefault)?.city.trim() || addresses[0]?.city.trim() || "";
  const fromFallback = fallback?.trim() || "";
  return fromAddress || fromFallback || null;
}

function listedAt(row: AdminCustomerListItem): number {
  const iso = row.lastOrderAt || row.createdAt;
  return iso ? Date.parse(iso) : 0;
}

function buildOrderAggByEmail(
  orders: Array<{
    id: bigint;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string;
    shippingCity: string;
    total: { toString(): string } | number;
    currency: string;
    createdAt: Date;
    orderNumber: string;
  }>,
): Map<string, OrderAgg> {
  const map = new Map<string, OrderAgg>();
  for (const order of orders) {
    const email = order.customerEmail?.trim().toLowerCase();
    if (!email) continue;
    const total = Number(order.total);
    const existing = map.get(email);
    if (existing) {
      existing.count += 1;
      existing.total += Number.isFinite(total) ? total : 0;
      continue;
    }
    map.set(email, {
      count: 1,
      total: Number.isFinite(total) ? total : 0,
      currency: order.currency || "EUR",
      lastAt: order.createdAt.toISOString(),
      lastNumber: order.orderNumber,
      lastId: Number(order.id),
      name: order.customerName,
      phone: order.customerPhone,
      city: order.shippingCity.trim(),
    });
  }
  return map;
}

function normalizeDirectoryQuery(
  searchOrOptions?: string | AdminCustomerDirectoryQuery,
): AdminCustomerDirectoryQuery {
  if (typeof searchOrOptions === "string") {
    return { q: searchOrOptions };
  }
  return searchOrOptions ?? {};
}

export async function listAdminCustomerDirectory(
  searchOrOptions?: string | AdminCustomerDirectoryQuery,
): Promise<AdminCustomerDirectoryResult> {
  const query = normalizeDirectoryQuery(searchOrOptions);
  const prisma = requirePrisma();
  const [customers, orders] = await Promise.all([
    prisma.customer.findMany({
      include: {
        addresses: {
          select: { city: true, isDefault: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        shippingCity: true,
        total: true,
        currency: true,
        createdAt: true,
        orderNumber: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const agg = buildOrderAggByEmail(orders);
  const accountEmails = new Set(customers.map((c) => c.email.trim().toLowerCase()));

  const accounts: AdminCustomerListItem[] = customers.map((customer) => {
    const email = customer.email.trim().toLowerCase();
    const stats = agg.get(email);
    return {
      id: customer.id,
      kind: "account",
      email: customer.email,
      name: customer.name?.trim() || stats?.name || customer.email,
      phone: customer.phone || stats?.phone || null,
      city: pickCity(customer.addresses, stats?.city),
      createdAt: customer.createdAt.toISOString(),
      orderCount: stats?.count ?? 0,
      totalSpent: stats?.total ?? 0,
      currency: stats?.currency ?? "EUR",
      lastOrderAt: stats?.lastAt ?? null,
      lastOrderNumber: stats?.lastNumber ?? null,
      lastOrderId: stats?.lastId ?? null,
      addressCount: customer.addresses.length,
    };
  });

  const guestMap = new Map<string, AdminCustomerListItem>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const email = order.customerEmail?.trim().toLowerCase() || null;
    if (email && accountEmails.has(email)) continue;
    const phone = order.customerPhone.trim();
    const key = email || (phone ? `tel:${phone}` : `order:${order.orderNumber}`);
    const existing = guestMap.get(key);
    const total = Number(order.total);
    const city = order.shippingCity.trim();
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += Number.isFinite(total) ? total : 0;
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.city && city) existing.city = city;
      continue;
    }
    const lastOrderAt = order.createdAt.toISOString();
    guestMap.set(key, {
      id: null,
      kind: "guest",
      email,
      name: order.customerName,
      phone: phone || null,
      city: city || null,
      createdAt: lastOrderAt,
      orderCount: 1,
      totalSpent: Number.isFinite(total) ? total : 0,
      currency: order.currency || "EUR",
      lastOrderAt,
      lastOrderNumber: order.orderNumber,
      lastOrderId: Number(order.id),
      addressCount: 0,
    });
  }

  const guests = [...guestMap.values()];
  const directory = [...accounts, ...guests].sort((a, b) => listedAt(b) - listedAt(a));

  const cities = [
    ...new Set(directory.map((row) => row.city?.trim()).filter((city): city is string => Boolean(city))),
  ].sort((a, b) => a.localeCompare(b, "nl"));

  const q = query.q?.trim().toLowerCase() ?? "";
  const cityFilter = query.city?.trim().toLowerCase() ?? "";
  const kind: AdminCustomerKindFilter = query.kind === "account" || query.kind === "guest" ? query.kind : "all";

  const searched = directory.filter((row) => {
    if (q && ![row.name, row.email ?? "", row.phone ?? "", row.city ?? ""].join(" ").toLowerCase().includes(q)) {
      return false;
    }
    if (cityFilter && (row.city ?? "").toLowerCase() !== cityFilter) {
      return false;
    }
    return true;
  });

  const counts = {
    all: searched.length,
    account: searched.filter((row) => row.kind === "account").length,
    guest: searched.filter((row) => row.kind === "guest").length,
  };

  const filtered = kind === "all" ? searched : searched.filter((row) => row.kind === kind);
  const pageSize = Math.max(1, Math.floor(query.pageSize ?? 50));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = Math.min(Math.max(1, query.page ?? 1), totalPages);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return {
    rows,
    accounts: searched.filter((row) => row.kind === "account"),
    guests: searched.filter((row) => row.kind === "guest"),
    cities,
    counts,
    total,
    totalPages,
    page,
    from,
    to,
  };
}

export async function getAdminCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const prisma = requirePrisma();
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] } },
  });
  if (!customer) return null;

  const email = customer.email.trim().toLowerCase();
  const orders = await prisma.order.findMany({
    where: { customerEmail: { equals: email, mode: "insensitive" } },
    select: { id: true, total: true, createdAt: true, orderNumber: true },
    orderBy: { createdAt: "desc" },
  });
  const last = orders[0] ?? null;

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    addresses: customer.addresses.map(mapAddress),
    orderCount: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + Number(order.total), 0),
    lastOrderAt: last?.createdAt.toISOString() ?? null,
    lastOrderNumber: last?.orderNumber ?? null,
    lastOrderId: last ? Number(last.id) : null,
  };
}

export async function findAdminCustomerIdByEmail(email: string | null | undefined): Promise<string | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  const prisma = requirePrisma();
  const row = await prisma.customer.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function createAdminCustomer(input: {
  email: string;
  name?: string | null;
  phone?: string | null;
  password?: string | null;
  addresses?: AdminCustomerAddressWrite[];
}): Promise<{ customer: AdminCustomerDetail; generatedPassword: string | null }> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("Vul een geldig e-mailadres in.");
  }
  const password = input.password?.trim() || "";
  const generatedPassword = password ? null : generateTempPassword();
  const finalPassword = password || generatedPassword!;
  if (finalPassword.length < 8) {
    throw new Error("Wachtwoord moet minstens 8 tekens zijn.");
  }

  const prisma = requirePrisma();
  try {
    const created = await prisma.customer.create({
      data: {
        email,
        name: input.name?.trim() || null,
        phone: input.phone?.trim() || null,
        passwordHash: hashCustomerPassword(finalPassword),
        addresses: input.addresses?.length
          ? {
              create: input.addresses.map((address, index) => ({
                label: address.label?.trim() || null,
                line1: address.line1.trim(),
                line2: address.line2?.trim() || null,
                postalCode: address.postalCode.trim(),
                city: address.city.trim(),
                country: (address.country?.trim() || "NL").toUpperCase(),
                isDefault: address.isDefault ?? index === 0,
              })),
            }
          : undefined,
      },
    });
    const customer = await getAdminCustomer(created.id);
    if (!customer) {
      throw new Error("Klant aanmaken mislukt.");
    }
    revalidatePath("/admin/customers");
    return { customer, generatedPassword };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Dit e-mailadres is al in gebruik.");
    }
    throw e;
  }
}

export async function updateAdminCustomer(
  id: string,
  input: {
    email?: string;
    name?: string | null;
    phone?: string | null;
    password?: string | null;
    addresses?: AdminCustomerAddressWrite[];
  },
): Promise<AdminCustomerDetail> {
  const prisma = requirePrisma();
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Klant niet gevonden.");
  }

  const data: {
    email?: string;
    name?: string | null;
    phone?: string | null;
    passwordHash?: string;
  } = {};
  if (input.email != null) {
    const email = normalizeEmail(input.email);
    if (!email || !email.includes("@")) {
      throw new Error("Vul een geldig e-mailadres in.");
    }
    data.email = email;
  }
  if (input.name !== undefined) data.name = input.name?.trim() || null;
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.password?.trim()) {
    if (input.password.trim().length < 8) {
      throw new Error("Wachtwoord moet minstens 8 tekens zijn.");
    }
    data.passwordHash = hashCustomerPassword(input.password.trim());
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.customer.update({ where: { id }, data });
      if (input.addresses) {
        const keepIds = input.addresses.map((a) => a.id).filter((a): a is string => Boolean(a));
        if (keepIds.length > 0) {
          await tx.customerAddress.deleteMany({
            where: { customerId: id, id: { notIn: keepIds } },
          });
        } else {
          await tx.customerAddress.deleteMany({ where: { customerId: id } });
        }
        for (const [index, address] of input.addresses.entries()) {
          const line1 = address.line1.trim();
          const city = address.city.trim();
          const postalCode = address.postalCode.trim();
          if (!line1 || !city || !postalCode) {
            throw new Error("Adres, postcode en plaats zijn verplicht.");
          }
          const payload = {
            label: address.label?.trim() || null,
            line1,
            line2: address.line2?.trim() || null,
            postalCode,
            city,
            country: (address.country?.trim() || "NL").toUpperCase(),
            isDefault: address.isDefault ?? index === 0,
          };
          if (address.id) {
            const owned = await tx.customerAddress.findFirst({
              where: { id: address.id, customerId: id },
            });
            if (!owned) {
              throw new Error("Adres hoort niet bij deze klant.");
            }
            await tx.customerAddress.update({
              where: { id: address.id },
              data: payload,
            });
          } else {
            await tx.customerAddress.create({
              data: { ...payload, customerId: id },
            });
          }
        }
      }
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Dit e-mailadres is al in gebruik.");
    }
    throw e;
  }

  const customer = await getAdminCustomer(id);
  if (!customer) {
    throw new Error("Klant niet gevonden.");
  }
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return customer;
}

export async function deleteAdminCustomer(id: string): Promise<void> {
  const prisma = requirePrisma();
  try {
    await prisma.customer.delete({ where: { id } });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      throw new Error("Klant niet gevonden.");
    }
    throw e;
  }
  revalidatePath("/admin/customers");
}
