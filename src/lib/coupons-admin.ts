import "server-only";

import { requirePrisma } from "@/lib/database";

export type AdminCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  amount: number;
  minSubtotal: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

function toAdminCoupon(row: {
  id: string;
  code: string;
  type: string;
  amount: { toString(): string } | number;
  minSubtotal: { toString(): string } | number | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}): AdminCoupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type === "fixed" ? "fixed" : "percent",
    amount: Number(row.amount),
    minSubtotal: row.minSubtotal == null ? null : Number(row.minSubtotal),
    active: row.active,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAdminCoupons(): Promise<AdminCoupon[]> {
  const prisma = requirePrisma();
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toAdminCoupon);
}

export type CouponWriteInput = {
  code: string;
  type: "percent" | "fixed";
  amount: number;
  minSubtotal?: number | null;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

function parseDate(value?: string | null): Date | null {
  const t = value?.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createAdminCoupon(input: CouponWriteInput): Promise<AdminCoupon> {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) {
    throw new Error("Code is verplicht.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Vul een geldig kortingsbedrag in.");
  }
  if (input.type === "percent" && input.amount > 100) {
    throw new Error("Percentage mag maximaal 100 zijn.");
  }
  const prisma = requirePrisma();
  try {
    const row = await prisma.coupon.create({
      data: {
        code,
        type: input.type,
        amount: input.amount,
        minSubtotal: input.minSubtotal != null && Number.isFinite(input.minSubtotal) ? input.minSubtotal : null,
        active: input.active !== false,
        startsAt: parseDate(input.startsAt),
        endsAt: parseDate(input.endsAt),
      },
    });
    return toAdminCoupon(row);
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "P2002") {
      throw new Error("Deze code bestaat al.");
    }
    throw e;
  }
}

export async function updateAdminCoupon(id: string, patch: Partial<CouponWriteInput>): Promise<AdminCoupon> {
  const prisma = requirePrisma();
  const data: {
    code?: string;
    type?: string;
    amount?: number;
    minSubtotal?: number | null;
    active?: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
  } = {};
  if (typeof patch.code === "string") {
    const code = patch.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) throw new Error("Code is verplicht.");
    data.code = code;
  }
  if (patch.type === "percent" || patch.type === "fixed") {
    data.type = patch.type;
  }
  if (patch.amount != null) {
    if (!Number.isFinite(patch.amount) || patch.amount <= 0) {
      throw new Error("Vul een geldig kortingsbedrag in.");
    }
    data.amount = patch.amount;
  }
  if (patch.minSubtotal !== undefined) {
    data.minSubtotal =
      patch.minSubtotal != null && Number.isFinite(patch.minSubtotal) ? patch.minSubtotal : null;
  }
  if (typeof patch.active === "boolean") {
    data.active = patch.active;
  }
  if (patch.startsAt !== undefined) {
    data.startsAt = parseDate(patch.startsAt);
  }
  if (patch.endsAt !== undefined) {
    data.endsAt = parseDate(patch.endsAt);
  }
  const row = await prisma.coupon.update({ where: { id }, data });
  return toAdminCoupon(row);
}

export async function deleteAdminCoupon(id: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.coupon.delete({ where: { id } });
}
