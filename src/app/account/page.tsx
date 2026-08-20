import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import AccountAuthForm from "@/components/account/AccountAuthForm";
import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = ui(locale);
  return buildPageMetadata({
    title: t.account,
    description: t.accountOptional,
    path: "/account",
    noindex: true,
  });
}

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <div className="mx-auto max-w-md px-4 py-12">
        <AccountAuthForm />
      </div>
      <Footer />
    </main>
  );
}
