"use client";

import Link from "next/link";
import BrandWordmark from "@/components/layout/BrandWordmark";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import AdminSidebarDbStatus from "@/components/admin/AdminSidebarDbStatus";
import AdminSidebarEasySalesStatus from "@/components/admin/AdminSidebarEasySalesStatus";
import AdminSidebarIntegrationStatus from "@/components/admin/AdminSidebarIntegrationStatus";
import AdminSidebarTikTokStatus from "@/components/admin/AdminSidebarTikTokStatus";
import AdminTopbar from "@/components/admin/AdminTopbar";

function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="admin-btn-logout"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }}
    >
      Sign out
    </button>
  );
}

type NavLinkProps = {
  href: string;
  active: boolean;
  onNavigate: () => void;
  children: ReactNode;
};

function AdminNavLink({ href, active, onNavigate, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`admin-sidebar-link${active ? " active" : ""}`}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

type AdminDashboardShellProps = {
  children: ReactNode;
  roleLabel: string;
  superAdmin: boolean;
};

export default function AdminDashboardShell({ children, roleLabel, superAdmin }: AdminDashboardShellProps) {
  const path = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  useEffect(() => {
    closeMenu();
  }, [path, closeMenu]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  const dashActive = path === "/admin" || path === "/admin/";
  const productsActive = path.startsWith("/admin/products");
  const importActive = path.startsWith("/admin/import");
  const ordersActive = path.startsWith("/admin/orders");
  const customersActive = path.startsWith("/admin/customers");
  const pagesActive = path.startsWith("/admin/pages");
  const analyticsActive = path.startsWith("/admin/analytics");
  const performanceActive = path.startsWith("/admin/performance");
  const aiImagesGenerateActive = path === "/admin/ai-images" || path === "/admin/ai-images/";
  const aiImagesTemplatesActive = path.startsWith("/admin/ai-images/templates");
  const aiImagesLibraryActive = path.startsWith("/admin/ai-images/library");
  const aiImagesActive =
    aiImagesGenerateActive || aiImagesTemplatesActive || aiImagesLibraryActive;
  const categoriesActive = path.startsWith("/admin/categories");
  const reportsActive = path.startsWith("/admin/reports");
  const oneMillionPlanActive =
    path.startsWith("/admin/one-million-plan") || path.startsWith("/admin/one-percent-plan");
  const settingsActive = path.startsWith("/admin/settings");
  const emailActive = path.startsWith("/admin/email");
  const marketingOverviewActive = path === "/admin/marketing" || path === "/admin/marketing/";
  const marketingTiktokActive = path.startsWith("/admin/marketing/tiktok");
  const marketingMetaActive = path.startsWith("/admin/marketing/meta");
  const marketingGoogleAdsActive = path.startsWith("/admin/marketing/google-ads");
  const marketingMerchantActive = path.startsWith("/admin/marketing/google-merchant");
  const marketingEmailChannelActive = path.startsWith("/admin/marketing/email");
  const marketingActive =
    marketingOverviewActive ||
    marketingTiktokActive ||
    marketingMetaActive ||
    marketingGoogleAdsActive ||
    marketingMerchantActive ||
    marketingEmailChannelActive;
  const easySalesOrdersActive = path.startsWith("/admin/easy-sales-orders");
  const usersActive = path.startsWith("/admin/users");

  return (
    <div className={`admin-shell${menuOpen ? " admin-shell--menu-open" : ""}`}>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close menu"
        onClick={closeMenu}
      />
      <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`} aria-label="Admin navigation">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand-row">
            <div>
              <BrandWordmark compact className="mb-2" />
              <div
                className={`admin-sidebar-sub${roleLabel === "Super admin" ? " admin-sidebar-sub--super" : ""}`}
              >
                {roleLabel}
              </div>
            </div>
            <button
              type="button"
              className="admin-sidebar-close"
              aria-label="Close menu"
              onClick={closeMenu}
            >
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>
        <nav id="admin-sidebar-nav" className="admin-sidebar-nav" aria-label="Sections">
          <AdminNavLink href="/admin" active={dashActive} onNavigate={closeMenu}>
            Dashboard
          </AdminNavLink>
          <AdminNavLink href="/admin/one-million-plan" active={oneMillionPlanActive} onNavigate={closeMenu}>
            1 Million Plan
          </AdminNavLink>
          <AdminNavLink href="/admin/analytics" active={analyticsActive} onNavigate={closeMenu}>
            Live analytics
          </AdminNavLink>
          <AdminNavLink href="/admin/performance" active={performanceActive} onNavigate={closeMenu}>
            Performance
          </AdminNavLink>
          <AdminNavLink href="/admin/reports" active={reportsActive} onNavigate={closeMenu}>
            Reports
          </AdminNavLink>
          {superAdmin ? (
            <AdminNavLink href="/admin/easy-sales-orders" active={easySalesOrdersActive} onNavigate={closeMenu}>
              Easy Sales
            </AdminNavLink>
          ) : null}
          <AdminNavLink href="/admin/products" active={productsActive} onNavigate={closeMenu}>
            Products
          </AdminNavLink>
          <div className={`admin-sidebar-group${aiImagesActive ? " is-active-group" : ""}`}>
            <span className="admin-sidebar-group-label">AI images</span>
            <AdminNavLink href="/admin/ai-images" active={aiImagesGenerateActive} onNavigate={closeMenu}>
              Generate
            </AdminNavLink>
            <AdminNavLink href="/admin/ai-images/templates" active={aiImagesTemplatesActive} onNavigate={closeMenu}>
              Templates
            </AdminNavLink>
            <AdminNavLink href="/admin/ai-images/library" active={aiImagesLibraryActive} onNavigate={closeMenu}>
              Library
            </AdminNavLink>
          </div>
          <AdminNavLink href="/admin/import" active={importActive} onNavigate={closeMenu}>
            Import
          </AdminNavLink>
          <AdminNavLink href="/admin/categories" active={categoriesActive} onNavigate={closeMenu}>
            Category SEO
          </AdminNavLink>
          <AdminNavLink href="/admin/orders" active={ordersActive} onNavigate={closeMenu}>
            Shop orders
          </AdminNavLink>
          <AdminNavLink href="/admin/customers" active={customersActive} onNavigate={closeMenu}>
            Customers
          </AdminNavLink>
          <AdminNavLink href="/admin/pages" active={pagesActive} onNavigate={closeMenu}>
            CMS pages
          </AdminNavLink>
          <AdminNavLink href="/admin/email" active={emailActive} onNavigate={closeMenu}>
            Email
          </AdminNavLink>
          <div className={`admin-sidebar-group${marketingActive ? " is-active-group" : ""}`}>
            <span className="admin-sidebar-group-label">Marketing</span>
            <AdminNavLink href="/admin/marketing" active={marketingOverviewActive} onNavigate={closeMenu}>
              Overview
            </AdminNavLink>
            <AdminNavLink href="/admin/marketing/tiktok" active={marketingTiktokActive} onNavigate={closeMenu}>
              TikTok
            </AdminNavLink>
            <AdminNavLink href="/admin/marketing/meta" active={marketingMetaActive} onNavigate={closeMenu}>
              Meta
            </AdminNavLink>
            <AdminNavLink
              href="/admin/marketing/google-ads"
              active={marketingGoogleAdsActive}
              onNavigate={closeMenu}
            >
              Google Ads
            </AdminNavLink>
            <AdminNavLink
              href="/admin/marketing/google-merchant"
              active={marketingMerchantActive}
              onNavigate={closeMenu}
            >
              Merchant
            </AdminNavLink>
            <AdminNavLink
              href="/admin/marketing/email"
              active={marketingEmailChannelActive}
              onNavigate={closeMenu}
            >
              Email &amp; CRM
            </AdminNavLink>
          </div>
          <AdminNavLink href="/admin/settings" active={settingsActive} onNavigate={closeMenu}>
            Settings
          </AdminNavLink>
          {superAdmin ? (
            <AdminNavLink href="/admin/users" active={usersActive} onNavigate={closeMenu}>
              Users
            </AdminNavLink>
          ) : null}
          <AdminNavLink href="/" active={false} onNavigate={closeMenu}>
            View shop
          </AdminNavLink>
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-sidebar-integrations" aria-label="Integrations">
            <AdminSidebarDbStatus />
            <AdminSidebarEasySalesStatus />
            <AdminSidebarTikTokStatus />
            <AdminSidebarIntegrationStatus
              title="Cron (Vercel)"
              statusUrl="/api/admin/cron-status"
            />
            <AdminSidebarIntegrationStatus
              title="ChatGPT Connection"
              statusUrl="/api/admin/chatgpt-status"
            />
            <AdminSidebarIntegrationStatus
              title="AI Image generation"
              statusUrl="/api/admin/ai-image-status"
            />
          </div>
          <AdminLogoutButton />
        </div>
      </aside>
      <div className="admin-main-area">
        <AdminTopbar menuOpen={menuOpen} onMenuToggle={toggleMenu} />
        <div className="admin-main-scroll">
          <div className="admin-main-pad">{children}</div>
        </div>
      </div>
    </div>
  );
}
