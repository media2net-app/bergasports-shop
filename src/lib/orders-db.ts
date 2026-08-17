import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

import type { CustomerSummary } from "@/lib/customers";
import { customerKeyFromPhone } from "@/lib/customers";
import { requirePrisma } from "@/lib/database";
import { pushOrderToEasySalesAfterCreate } from "@/lib/easy-sales-sync";
import type { CreateOrderInput, OrderRow, OrderStatus, OrderWithItems } from "@/lib/orders";
import { ORDER_STATUSES } from "@/lib/orders";
import {
  parseStatusEmailsSent,
  sendOrderStatusEmailToCustomer,
  statusToEmailKind,
  type OrderStatusEmailKind,
} from "@/lib/order-customer-email";
import {
  sendPostPurchaseMarketingEmail,
  sendWelcomeMarketingEmail,
} from "@/lib/marketing-email";
import { notifyAdminNewOrder } from "@/lib/order-admin-notification";
import { bigIntToNumber, decimalToNumber, productIdToBigInt } from "@/lib/prisma-mappers";

function generateOrderNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BS-${y}${m}${day}-${r}`;
}

function prismaOrderToRow(o: {
  id: bigint;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCounty: string | null;
  shippingPostalCode: string | null;
  notes: string | null;
  paymentMethod: string;
  molliePaymentId?: string | null;
  currency: string;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  easySalesSyncStatus: string | null;
  easySalesSyncError: string | null;
  easySalesSyncedAt: Date | null;
  statusEmailsSent: Prisma.JsonValue | null;
  marketingConsent: boolean;
}): OrderRow {
  return {
    id: bigIntToNumber(o.id),
    order_number: o.orderNumber,
    status: o.status as OrderStatus,
    customer_name: o.customerName,
    customer_email: o.customerEmail,
    customer_phone: o.customerPhone,
    shipping_address: o.shippingAddress,
    shipping_city: o.shippingCity,
    shipping_county: o.shippingCounty,
    shipping_postal_code: o.shippingPostalCode,
    notes: o.notes,
    payment_method: o.paymentMethod,
    mollie_payment_id: o.molliePaymentId ?? null,
    currency: o.currency,
    subtotal: decimalToNumber(o.subtotal) ?? 0,
    discount_total: decimalToNumber(o.discountTotal) ?? 0,
    total: decimalToNumber(o.total) ?? 0,
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
    easy_sales_sync_status: o.easySalesSyncStatus,
    easy_sales_sync_error: o.easySalesSyncError,
    easy_sales_synced_at: o.easySalesSyncedAt?.toISOString() ?? null,
    status_emails_sent:
      o.statusEmailsSent != null && typeof o.statusEmailsSent === "object"
        ? (o.statusEmailsSent as Record<string, string>)
        : null,
    marketing_consent: o.marketingConsent,
  };
}

async function markStatusEmailSent(orderId: number, kind: OrderStatusEmailKind): Promise<void> {
  const prisma = requirePrisma();
  const row = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    select: { statusEmailsSent: true },
  });
  if (!row) {
    return;
  }
  const sent = parseStatusEmailsSent(row.statusEmailsSent);
  if (sent[kind]) {
    return;
  }
  const next = { ...sent, [kind]: new Date().toISOString() };
  await prisma.order.update({
    where: { id: BigInt(orderId) },
    data: { statusEmailsSent: next },
  });
}

async function deliverCustomerStatusEmail(
  order: OrderWithItems,
  kind: OrderStatusEmailKind,
): Promise<void> {
  const sent = parseStatusEmailsSent(order.status_emails_sent);
  if (sent[kind]) {
    return;
  }
  const ok = await sendOrderStatusEmailToCustomer(order, kind);
  if (ok) {
    await markStatusEmailSent(order.id, kind);
  }
}

export async function createOrder(
  input: CreateOrderInput & { status?: OrderStatus },
): Promise<{ id: number; orderNumber: string }> {
  const prisma = requirePrisma();
  const orderNumber = generateOrderNumber();
  const paymentMethod = input.paymentMethod ?? "cash_on_delivery";
  const initialStatus: OrderStatus =
    input.status ?? (paymentMethod === "mollie" ? "awaiting_payment" : "pending");

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        status: initialStatus,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail?.trim() || null,
        customerPhone: input.customerPhone.trim(),
        shippingAddress: input.shippingAddress.trim(),
        shippingCity: input.shippingCity.trim(),
        shippingCounty: input.shippingCounty?.trim() || null,
        shippingPostalCode: input.shippingPostalCode?.trim() || null,
        notes: input.notes?.trim() || null,
        paymentMethod,
        currency: input.currency,
        subtotal: input.subtotal,
        discountTotal: input.discountTotal,
        total: input.total,
        marketingConsent: Boolean(input.marketingConsent),
        items: {
          create: input.items.map((item) => ({
            productId: item.productId ? productIdToBigInt(item.productId) : null,
            lineId: item.lineId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            currency: item.currency,
            image: item.image ?? null,
            variationLabel: item.variationLabel ?? null,
            bundleTierId: item.bundleTierId ?? null,
          })),
        },
      },
      select: { id: true, orderNumber: true, createdAt: true },
    });
    return created;
  });

  const orderId = bigIntToNumber(order.id);
  const now = order.createdAt.toISOString();

  revalidatePath("/admin/orders");

  // Defer fulfillment side-effects until Mollie payment is confirmed.
  if (initialStatus !== "awaiting_payment") {
    void runOrderPaidSideEffects(orderId, {
      ...input,
      paymentMethod,
      orderNumber: order.orderNumber,
      createdAt: now,
    });
  }

  return { id: orderId, orderNumber: order.orderNumber };
}

type OrderPaidSideEffectInput = CreateOrderInput & {
  orderNumber: string;
  createdAt: string;
  paymentMethod: string;
};

async function runOrderPaidSideEffects(orderId: number, input: OrderPaidSideEffectInput): Promise<void> {
  void pushOrderToEasySalesAfterCreate(orderId, {
    ...input,
    orderNumber: input.orderNumber,
    createdAt: input.createdAt,
  });

  void notifyAdminNewOrder({
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    total: input.total,
    currency: input.currency,
    subtotal: input.subtotal,
    discountTotal: input.discountTotal,
    shippingAddress: input.shippingAddress,
    shippingCity: input.shippingCity,
    shippingCounty: input.shippingCounty,
    shippingPostalCode: input.shippingPostalCode,
    notes: input.notes,
    paymentMethod: input.paymentMethod,
    items: input.items.map((item, index) => ({
      id: index + 1,
      order_id: orderId,
      product_id: item.productId,
      line_id: item.lineId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      currency: item.currency,
      image: item.image ?? null,
      variation_label: item.variationLabel ?? null,
      bundle_tier_id: item.bundleTierId ?? null,
    })),
  });

  if (input.customerEmail?.trim()) {
    void getOrderById(orderId).then(async (full) => {
      if (!full) {
        return;
      }
      await deliverCustomerStatusEmail(full, "received");
      if (full.marketing_consent) {
        void sendWelcomeMarketingEmail(full.customer_name, full.customer_email!, orderId);
      }
    });
  }
}

export async function attachMolliePaymentId(orderId: number, molliePaymentId: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.order.update({
    where: { id: BigInt(orderId) },
    data: { molliePaymentId },
  });
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  const prisma = requirePrisma();
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) {
    return null;
  }
  return {
    ...prismaOrderToRow(order),
    items: order.items.map((row) => ({
      id: bigIntToNumber(row.id),
      order_id: bigIntToNumber(row.orderId),
      product_id: row.productId != null ? bigIntToNumber(row.productId) : null,
      line_id: row.lineId,
      name: row.name,
      quantity: row.quantity,
      unit_price: decimalToNumber(row.unitPrice) ?? 0,
      line_total: decimalToNumber(row.lineTotal) ?? 0,
      currency: row.currency,
      image: row.image,
      variation_label: row.variationLabel,
      bundle_tier_id: row.bundleTierId,
    })),
  };
}

export async function getOrderByMolliePaymentId(paymentId: string): Promise<OrderWithItems | null> {
  const prisma = requirePrisma();
  const order = await prisma.order.findFirst({
    where: { molliePaymentId: paymentId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) {
    return null;
  }
  return {
    ...prismaOrderToRow(order),
    items: order.items.map((row) => ({
      id: bigIntToNumber(row.id),
      order_id: bigIntToNumber(row.orderId),
      product_id: row.productId != null ? bigIntToNumber(row.productId) : null,
      line_id: row.lineId,
      name: row.name,
      quantity: row.quantity,
      unit_price: decimalToNumber(row.unitPrice) ?? 0,
      line_total: decimalToNumber(row.lineTotal) ?? 0,
      currency: row.currency,
      image: row.image,
      variation_label: row.variationLabel,
      bundle_tier_id: row.bundleTierId,
    })),
  };
}

/** Mark Mollie order as paid (pending) and run post-payment side effects once. */
export async function markMollieOrderPaid(orderId: number): Promise<OrderWithItems | null> {
  const prisma = requirePrisma();
  const existing = await getOrderById(orderId);
  if (!existing) {
    return null;
  }
  if (existing.status !== "awaiting_payment") {
    return existing;
  }

  await prisma.order.update({
    where: { id: BigInt(orderId) },
    data: { status: "pending" },
  });
  revalidatePath("/admin/orders");

  const paid = await getOrderById(orderId);
  if (!paid) {
    return null;
  }

  void runOrderPaidSideEffects(orderId, {
    customerName: paid.customer_name,
    customerEmail: paid.customer_email ?? undefined,
    marketingConsent: paid.marketing_consent,
    customerPhone: paid.customer_phone,
    shippingAddress: paid.shipping_address,
    shippingCity: paid.shipping_city,
    shippingCounty: paid.shipping_county ?? undefined,
    shippingPostalCode: paid.shipping_postal_code ?? undefined,
    notes: paid.notes ?? undefined,
    paymentMethod: paid.payment_method,
    currency: paid.currency,
    subtotal: paid.subtotal,
    discountTotal: paid.discount_total,
    total: paid.total,
    orderNumber: paid.order_number,
    createdAt: paid.created_at,
    items: paid.items.map((item) => ({
      productId: item.product_id ?? 0,
      lineId: item.line_id ?? String(item.id),
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      currency: item.currency,
      image: item.image ?? undefined,
      variationLabel: item.variation_label ?? undefined,
      bundleTierId: item.bundle_tier_id ?? undefined,
    })),
  });

  return paid;
}

export type ListOrdersOptions = {
  status?: OrderStatus | "all";
  page?: number;
  pageSize?: number;
  easySalesSync?: "all" | "failed" | "pending" | "synced";
};

export async function listOrders(options: ListOrdersOptions = {}): Promise<{
  orders: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const prisma = requirePrisma();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.OrderWhereInput = {};
  if (options.status && options.status !== "all") {
    where.status = options.status;
  }
  if (options.easySalesSync === "failed") {
    where.easySalesSyncStatus = "failed";
  } else if (options.easySalesSync === "pending") {
    where.easySalesSyncStatus = null;
  } else if (options.easySalesSync === "synced") {
    where.easySalesSyncStatus = "synced";
  }

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    orders: rows.map(prismaOrderToRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getOrderById(id: number): Promise<OrderWithItems | null> {
  const prisma = requirePrisma();
  const order = await prisma.order.findUnique({
    where: { id: BigInt(id) },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) {
    return null;
  }

  return {
    ...prismaOrderToRow(order),
    items: order.items.map((row) => ({
      id: bigIntToNumber(row.id),
      order_id: bigIntToNumber(row.orderId),
      product_id: row.productId != null ? bigIntToNumber(row.productId) : null,
      line_id: row.lineId,
      name: row.name,
      quantity: row.quantity,
      unit_price: decimalToNumber(row.unitPrice) ?? 0,
      line_total: decimalToNumber(row.lineTotal) ?? 0,
      currency: row.currency,
      image: row.image,
      variation_label: row.variationLabel,
      bundle_tier_id: row.bundleTierId,
    })),
  };
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<OrderRow> {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error("Invalid status.");
  }
  const previous = await getOrderById(id);
  if (!previous) {
    throw new Error("Order not found.");
  }
  const previousStatus = previous.status;

  const prisma = requirePrisma();
  const data = await prisma.order.update({
    where: { id: BigInt(id) },
    data: { status },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);

  const emailKind = statusToEmailKind(status, previousStatus);
  if (emailKind && previous.customer_email?.trim()) {
    const full = await getOrderById(id);
    if (full) {
      void (async () => {
        await deliverCustomerStatusEmail(full, emailKind);
        if (status === "delivered" && full.marketing_consent) {
          await sendPostPurchaseMarketingEmail(full);
        }
      })();
    }
  }

  return prismaOrderToRow(data);
}

type OrderCustomerFields = {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  shipping_city: string;
  total: number;
  currency: string;
  created_at: string;
};

async function loadOrdersForCustomers(): Promise<OrderCustomerFields[]> {
  const prisma = requirePrisma();
  const rows = await prisma.order.findMany({
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingCity: true,
      total: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: bigIntToNumber(row.id),
    customer_name: row.customerName,
    customer_email: row.customerEmail,
    customer_phone: row.customerPhone,
    shipping_city: row.shippingCity,
    total: decimalToNumber(row.total) ?? 0,
    currency: row.currency,
    created_at: row.createdAt.toISOString(),
  }));
}

function buildCustomerMap(orders: OrderCustomerFields[]): Map<string, CustomerSummary> {
  const map = new Map<string, CustomerSummary>();
  for (const order of orders) {
    const key = customerKeyFromPhone(order.customer_phone);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        city: order.shipping_city,
        orderCount: 1,
        totalSpent: order.total,
        currency: order.currency,
        firstOrderAt: order.created_at,
        lastOrderAt: order.created_at,
        lastOrderId: order.id,
      });
      continue;
    }
    existing.orderCount += 1;
    existing.totalSpent += order.total;
    if (order.created_at < existing.firstOrderAt) {
      existing.firstOrderAt = order.created_at;
    }
    if (order.created_at > existing.lastOrderAt) {
      existing.lastOrderAt = order.created_at;
      existing.lastOrderId = order.id;
      existing.name = order.customer_name;
      existing.email = order.customer_email ?? existing.email;
      existing.phone = order.customer_phone;
      existing.city = order.shipping_city;
      existing.currency = order.currency;
    }
  }
  return map;
}

export type ListCustomersOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export async function listCustomers(options: ListCustomersOptions = {}): Promise<{
  customers: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const search = options.search?.trim().toLowerCase() ?? "";

  const orders = await loadOrdersForCustomers();
  let customers = [...buildCustomerMap(orders).values()].sort(
    (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime(),
  );

  if (search) {
    customers = customers.filter((c) => {
      const haystack = [c.name, c.phone, c.email ?? "", c.city ?? ""].join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }

  const total = customers.length;
  const from = (page - 1) * pageSize;
  return {
    customers: customers.slice(from, from + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCustomerByKey(key: string): Promise<CustomerSummary | null> {
  const orders = await loadOrdersForCustomers();
  return buildCustomerMap(orders).get(key) ?? null;
}

export async function listOrdersForCustomerKey(key: string): Promise<OrderRow[]> {
  const prisma = requirePrisma();
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows
    .map(prismaOrderToRow)
    .filter((order) => customerKeyFromPhone(order.customer_phone) === key);
}

export async function countOrdersByStatus(): Promise<Record<string, number>> {
  const prisma = requirePrisma();
  const counts: Record<string, number> = { all: 0 };
  for (const s of ORDER_STATUSES) {
    counts[s] = 0;
  }
  counts.all = await prisma.order.count();
  for (const s of ORDER_STATUSES) {
    counts[s] = await prisma.order.count({ where: { status: s } });
  }
  return counts;
}
