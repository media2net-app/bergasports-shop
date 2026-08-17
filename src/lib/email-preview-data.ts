import "server-only";

import type { OrderItemRow, OrderWithItems } from "@/lib/orders";
import type { Product } from "@/lib/products";
import { loadCatalogProducts, loadFeaturedProducts } from "@/lib/products-db";
import { mockOrderForEmailPreview } from "@/lib/email-preview-mocks";
import type { AdminNewOrderEmailInput } from "@/lib/transactional-order-emails";

function previewSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, "");
}

function toAbsoluteEmailImageUrl(image: string): string {
  const u = image.trim();
  if (!u) {
    return "";
  }
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  if (u.startsWith("//")) {
    return `https:${u}`;
  }
  const site = previewSiteUrl();
  if (u.startsWith("/")) {
    return `${site}${u}`;
  }
  return u;
}

function hasUsableImage(product: Product): boolean {
  const img = product.image?.trim();
  return Boolean(img);
}

async function pickPreviewProducts(limit: number): Promise<Product[]> {
  const picked: Product[] = [];
  const seen = new Set<number>();

  const add = (list: Product[]) => {
    for (const product of list) {
      if (picked.length >= limit) {
        break;
      }
      if (seen.has(product.id) || !hasUsableImage(product)) {
        continue;
      }
      seen.add(product.id);
      picked.push(product);
    }
  };

  try {
    add(await loadFeaturedProducts(limit * 3));
    if (picked.length < limit) {
      add(await loadCatalogProducts());
    }
  } catch {
    return [];
  }

  return picked;
}

function productToPreviewItem(product: Product, index: number, quantity: number): OrderItemRow {
  const variation = product.wcVariations?.[0];
  const unitPrice = variation?.price ?? product.price;
  const image = variation?.image?.trim() || product.image;

  return {
    id: index + 1,
    order_id: 0,
    product_id: product.id,
    line_id: variation ? `preview-v-${variation.id}` : `preview-${product.id}`,
    name: product.name,
    quantity,
    unit_price: unitPrice,
    line_total: Math.round(unitPrice * quantity * 100) / 100,
    currency: product.currency || "RON",
    image: toAbsoluteEmailImageUrl(image),
    variation_label: variation?.label ?? null,
    bundle_tier_id: null,
  };
}

function buildPreviewOrderFromProducts(products: Product[]): OrderWithItems {
  const quantities = products.length > 1 ? [1, 2] : [1];
  const items = products.map((product, index) =>
    productToPreviewItem(product, index, quantities[index] ?? 1),
  );
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.line_total, 0) * 100) / 100;

  return {
    id: 0,
    order_number: "ESH-PREVIEW-1042",
    status: "confirmed",
    customer_name: "Maria Popescu",
    customer_email: "client@example.com",
    customer_phone: "+40 721 234 567",
    shipping_address: "Str. Exemplu 12, bl. A, ap. 4",
    shipping_city: "Cluj-Napoca",
    shipping_county: "Cluj",
    shipping_postal_code: "400000",
    notes: "Sună înainte de livrare, te rog.",
    payment_method: "cash_on_delivery",
    mollie_payment_id: null,
    currency: items[0]?.currency ?? "RON",
    subtotal,
    discount_total: 0,
    total: subtotal,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    easy_sales_sync_status: null,
    easy_sales_sync_error: null,
    easy_sales_synced_at: null,
    status_emails_sent: null,
    marketing_consent: true,
    tracking_code: null,
    tracking_url: null,
    shipping_carrier: null,
    sendcloud_parcel_id: null,
    sendcloud_label_url: null,
    refunded_at: null,
    refund_amount: null,
    payment_status: null,
    items,
  };
}

export async function loadOrderForEmailPreview(): Promise<OrderWithItems> {
  const products = await pickPreviewProducts(2);
  if (products.length) {
    return buildPreviewOrderFromProducts(products);
  }
  return mockOrderForEmailPreview();
}

export async function loadAdminNewOrderEmailPreviewInput(): Promise<AdminNewOrderEmailInput> {
  const order = await loadOrderForEmailPreview();
  return {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email ?? undefined,
    total: order.total,
    currency: order.currency,
    subtotal: order.subtotal,
    discountTotal: order.discount_total,
    shippingAddress: order.shipping_address,
    shippingCity: order.shipping_city,
    shippingCounty: order.shipping_county ?? undefined,
    shippingPostalCode: order.shipping_postal_code ?? undefined,
    notes: order.notes ?? undefined,
    paymentMethod: order.payment_method,
    items: order.items,
  };
}
