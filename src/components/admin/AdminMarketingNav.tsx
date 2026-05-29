"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MARKETING_CHANNELS } from "@/lib/marketing-channels";

export default function AdminMarketingNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-marketing-nav" aria-label="Marketing channels">
      <Link
        href="/admin/marketing"
        className={`admin-marketing-nav-link${pathname === "/admin/marketing" ? " is-active" : ""}`}
      >
        Overview
      </Link>
      {MARKETING_CHANNELS.map((channel) => {
        const active = pathname === channel.href || pathname.startsWith(`${channel.href}/`);
        return (
          <Link
            key={channel.id}
            href={channel.href}
            className={`admin-marketing-nav-link${active ? " is-active" : ""}`}
          >
            {channel.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
