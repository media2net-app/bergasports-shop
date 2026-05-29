import "server-only";

import type { ShopDashboardOrder } from "@/lib/dashboard-aggregates";
import { readRalexCategoriesFromDb } from "@/lib/categories-db";
import { requirePrisma } from "@/lib/database";
import { listSitePages } from "@/lib/site-pages-db";
import { decimalToNumber } from "@/lib/prisma-mappers";

export type AdminDashboardStats = {
  productsCount: number;
  categoriesCount: number;
  pagesTotal: number;
  pagesPublished: number;
  shopOrders: ShopDashboardOrder[];
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const prisma = requirePrisma();

  const [categoriesFile, pages, productsCount, orders] = await Promise.all([
    readRalexCategoriesFromDb(),
    listSitePages(),
    prisma.product.count(),
    prisma.order.findMany({
      select: { total: true, status: true, createdAt: true, customerPhone: true },
    }),
  ]);

  const shopOrders: ShopDashboardOrder[] = orders.map((row) => ({
    createdAt: row.createdAt.toISOString(),
    total: decimalToNumber(row.total) ?? 0,
    status: row.status,
    customerPhone: row.customerPhone ?? "",
  }));

  return {
    productsCount,
    categoriesCount: categoriesFile.totalCategories ?? categoriesFile.categories.length,
    pagesTotal: pages.length,
    pagesPublished: pages.filter((p) => p.is_published).length,
    shopOrders,
  };
}
