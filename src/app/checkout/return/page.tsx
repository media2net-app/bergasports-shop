import type { Metadata } from "next";
import LocalizedLink from "@/components/locale/LocalizedLink";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { getMolliePayment } from "@/lib/mollie";
import { getOrderByNumber, markMollieOrderPaid } from "@/lib/orders-db";
import { formatProductPrice } from "@/lib/products";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ order?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = ui(locale);
  return buildPageMetadata({
    title: t.orderCompleteTitle,
    description: t.orderNotFoundText,
    path: "/checkout/return",
    noindex: true,
  });
}

export default async function CheckoutReturnPage({ searchParams }: PageProps) {
  const locale = await getRequestLocale();
  const t = ui(locale);
  const sp = (await searchParams) ?? {};
  const orderNumber = sp.order?.trim() || "";
  const order = orderNumber ? await getOrderByNumber(orderNumber) : null;

  let paid = order?.status === "pending" || order?.status === "confirmed";
  let pendingPayment = order?.status === "awaiting_payment";

  if (order?.mollie_payment_id && pendingPayment) {
    try {
      const payment = await getMolliePayment(order.mollie_payment_id);
      if (payment.status === "paid") {
        await markMollieOrderPaid(order.id);
        paid = true;
        pendingPayment = false;
      }
    } catch (e) {
      console.error("[checkout/return] mollie status", e);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <Header />
      <section className="mx-auto w-full max-w-lg px-4 py-12 md:py-16">
        {!order ? (
          <div className="rounded-2xl border border-[#e5dcc8] bg-white p-6 text-center">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)]">
              {t.orderNotFound}
            </h1>
            <p className="mt-2 text-sm text-[var(--foreground)]/75">{t.orderNotFoundText}</p>
            <LocalizedLink href="/shop" className="mt-6 inline-block text-sm font-semibold text-[#B38F27] underline">
              {t.backToShop}
            </LocalizedLink>
          </div>
        ) : paid ? (
          <div className="rounded-2xl border border-[#e5dcc8] bg-white p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t.paid}</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)]">
              {t.thanksOrder}
            </h1>
            <p className="mt-2 text-sm text-[var(--foreground)]/80">
              {t.orderPaid(order.order_number)}
              {order.customer_email ? t.confirmationTo(order.customer_email) : ""}.
            </p>
            <p className="mt-4 text-lg font-bold text-[var(--foreground)]">
              {formatProductPrice(order.total, order.currency)}
            </p>
            <LocalizedLink
              href="/shop"
              className="mt-8 inline-flex rounded-xl bg-[#B38F27] px-5 py-3 text-sm font-bold text-white hover:bg-[#96741f]"
            >
              {t.continueShopping}
            </LocalizedLink>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e5dcc8] bg-white p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {t.paymentPending}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)]">
              {t.pleaseWait}
            </h1>
            <p className="mt-2 text-sm text-[var(--foreground)]/80">
              {t.orderAwaitingMollie(order.order_number)}
            </p>
            <LocalizedLink
              href={`/checkout/return?order=${encodeURIComponent(order.order_number)}`}
              className="mt-8 inline-flex rounded-xl bg-[#B38F27] px-5 py-3 text-sm font-bold text-white hover:bg-[#96741f]"
            >
              {t.refreshStatus}
            </LocalizedLink>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
