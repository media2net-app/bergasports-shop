import Link from "next/link";

import { categoryShopHref } from "@/lib/category-shop-link";
import { formatRalexCategoryName, type RalexCategoryNode } from "@/lib/ralex-categories";

function CategoryBranch({ nodes, depth }: { nodes: RalexCategoryNode[]; depth: number }) {
  if (!nodes.length) {
    return null;
  }
  return (
    <ul className={depth === 0 ? "space-y-4" : "mt-2 space-y-2 border-l border-[#e5dcc8] pl-4"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex flex-wrap items-baseline gap-2">
            <Link
              href={categoryShopHref(node.slug)}
              className="font-semibold text-[var(--foreground)] underline decoration-[#e5dcc8] underline-offset-2 hover:text-[#96741f]"
            >
              {formatRalexCategoryName(node.name, node.slug)}
            </Link>
            <span className="text-xs text-[var(--foreground)]/50">{node.count} prod.</span>
          </div>
          {node.children?.length ? <CategoryBranch nodes={node.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default function RalexCategoryTree({ tree }: { tree: RalexCategoryNode[] }) {
  return <CategoryBranch nodes={tree} depth={0} />;
}
