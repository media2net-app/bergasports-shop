import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import AccountAuthForm from "@/components/account/AccountAuthForm";

export const metadata: Metadata = {
  title: "Account | Bergasports",
  description: "Inloggen of account aanmaken. Guest checkout blijft mogelijk.",
};

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <div className="mx-auto max-w-md px-4 py-12">
        <AccountAuthForm />
      </div>
      <Footer />
    </main>
  );
}
