"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

const SKIP_SELECTOR =
  "a, button, input, select, textarea, label, [role='button'], .admin-qty-field, .admin-checkbox";

function shouldIgnoreRowClick(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(SKIP_SELECTOR));
}

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
};

export default function AdminClickableTableRow({
  href,
  children,
  className,
  title = "Klik om te openen",
}: Props) {
  const router = useRouter();

  function go() {
    router.push(href);
  }

  function onClick(event: MouseEvent<HTMLTableRowElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (shouldIgnoreRowClick(event.target)) return;
    go();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (shouldIgnoreRowClick(event.target)) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    go();
  }

  return (
    <tr
      className={["admin-table-row-click", className].filter(Boolean).join(" ")}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      title={title}
    >
      {children}
    </tr>
  );
}
