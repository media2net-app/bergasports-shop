import "server-only";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import type {
  AdminCustomerAddress,
  AdminCustomerAddressWrite,
  AdminCustomerDetail,
  AdminCustomerListItem,
} from "@/lib/admin-customer-types";
import { hashCustomerPassword } from "@/lib/customer-auth";
import { requirePrisma } from "@/lib/database";

export type {
  AdminCustomerAddress,
  AdminCustomerAddressWrite,
  AdminCustomerDetail,
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
};

function buildOrderAggByEmail(
  orders: Array<{
    id: bigint;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string;
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
    });
  }
  return map;
}

export async function listAdminCustomerDirectory(search?: string): Promise<{
  accounts: AdminCustomerListItem[];
  guests: AdminCustomerListItem[];
}> {
  const prisma = requirePrisma();
  const [customers, orders] = await Promise.all([
    prisma.customer.findMany({
      include: { _count: { select: { addresses: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
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
      orderCount: stats?.count ?? 0,
      totalSpent: stats?.total ?? 0,
      currency: stats?.currency ?? "EUR",
      lastOrderAt: stats?.lastAt ?? null,
      lastOrderNumber: stats?.lastNumber ?? null,
      lastOrderId: stats?.lastId ?? null,
      addressCount: customer._count.addresses,
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
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += Number.isFinite(total) ? total : 0;
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;
      continue;
    }
    guestMap.set(key, {
      id: null,
      kind: "guest",
      email,
      name: order.customerName,
      phone: phone || null,
      orderCount: 1,
      totalSpent: Number.isFinite(total) ? total : 0,
      currency: order.currency || "EUR",
      lastOrderAt: order.createdAt.toISOString(),
      lastOrderNumber: order.orderNumber,
      lastOrderId: Number(order.id),
      addressCount: 0,
    });
  }

  const q = search?.trim().toLowerCase() ?? "";
  const matches = (row: AdminCustomerListItem) => {
    if (!q) return true;
    return [row.name, row.email ?? "", row.phone ?? ""].join(" ").toLowerCase().includes(q);
  };

  return {
    accounts: accounts.filter(matches),
    guests: [...guestMap.values()].filter(matches),
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
