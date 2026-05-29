import type { Prisma } from "@/generated/prisma/client";

export function productIdToBigInt(id: number): bigint {
  return BigInt(id);
}

export function bigIntToNumber(id: bigint): number {
  return Number(id);
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number(value);
}

export function toDecimal(value: number | null | undefined): Prisma.Decimal | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return value as unknown as Prisma.Decimal;
}
