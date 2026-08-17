import "server-only";

import type { ShopDashboardOrder } from "@/lib/dashboard-aggregates";
import { readRalexCategoriesFromDb } from "@/lib/categories-db";
import { requirePrisma } from "@/lib/database";
import { fetchAllProductsRaw } from "@/lib/products-db";
import { listSitePages } from "@/lib/site-pages-db";
import { countNewContactLeads } from "@/lib/contact-leads-db";
import { decimalToNumber } from "@/lib/prisma-mappers";
import { productStockState, type StockSummary } from "@/lib/stock";
import { getLowStockThresholdSetting } from "@/lib/shop-runtime";

export type DashboardRecentOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
};

export type AdminDashboardStats = {
  productsCount: number;
  categoriesCount: number;
  pagesTotal: number;
  pagesPublished: number;
  shopOrders: ShopDashboardOrder[];
  recentOrders: DashboardRecentOrder[];
  stock: StockSummary;
  newsPublished: number;
  newsDraft: number;
  newLeads: number;
  lowStockThreshold: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const prisma = requirePrisma();

  const [categoriesFile, pages, productsCount, orders, products, newsPublished, newsDraft, newLeads, lowStockThreshold] =
    await Promise.all([
      readRalexCategoriesFromDb(),
      listSitePages(),
      prisma.product.count(),
      prisma.order.findMany({
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          customerPhone: true,
          customerName: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      fetchAllProductsRaw(),
      prisma.newsPost.count({ where: { isPublished: true } }),
      prisma.newsPost.count({ where: { isPublished: false } }),
      countNewContactLeads(),
      getLowStockThresholdSetting(),
    ]);

  const stock: StockSummary = { inStock: 0, lowStock: 0, outOfStock: 0, unmanaged: 0 };
  for (const product of products) {
    switch (productStockState(product, lowStockThreshold)) {
      case "in_stock":
        stock.inStock += 1;
        break;
      case "low_stock":
        stock.lowStock += 1;
        break;
      case "out_of_stock":
        stock.outOfStock += 1;
        break;
      default:
        stock.unmanaged += 1;
    }
  }

  const shopOrders: ShopDashboardOrder[] = orders.map((row) => ({
    createdAt: row.createdAt.toISOString(),
    total: decimalToNumber(row.total) ?? 0,
    status: row.status,
    customerPhone: row.customerPhone ?? "",
  }));

  const recentOrders: DashboardRecentOrder[] = orders.slice(0, 8).map((row) => ({
    id: Number(row.id),
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    total: decimalToNumber(row.total) ?? 0,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    productsCount,
    categoriesCount: categoriesFile.totalCategories ?? categoriesFile.categories.length,
    pagesTotal: pages.length,
    pagesPublished: pages.filter((p) => p.is_published).length,
    shopOrders,
    recentOrders,
    stock,
    newsPublished,
    newsDraft,
    newLeads,
    lowStockThreshold,
  };
}
