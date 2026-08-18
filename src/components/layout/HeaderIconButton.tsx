import type { ButtonHTMLAttributes, ReactNode } from "react";

import LocalizedLink from "@/components/locale/LocalizedLink";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  badge?: number;
};

export default function HeaderIconButton({ label, children, badge, className = "", ...props }: Props) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white ${className}`}
      aria-label={label}
      {...props}
    >
      {children}
      {badge != null && badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--brand-mid)] px-1 text-[10px] font-bold leading-none text-[#1a1a1a]">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export function HeaderIconLink({
  href,
  label,
  children,
  badge,
  className = "",
}: {
  href: string;
  label: string;
  children: ReactNode;
  badge?: number;
  className?: string;
}) {
  return (
    <LocalizedLink
      href={href}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white ${className}`}
      aria-label={label}
    >
      {children}
      {badge != null && badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--brand-mid)] px-1 text-[10px] font-bold leading-none text-[#1a1a1a]">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </LocalizedLink>
  );
}
