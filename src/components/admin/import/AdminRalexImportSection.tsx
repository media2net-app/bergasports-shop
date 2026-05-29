"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { categoryShopHref } from "@/lib/category-shop-link";
import {
  flattenRalexCategoryTree,
  formatRalexCategoryName,
  isRalexCategoryImportComplete,
  type RalexCategoriesFile,
  type RalexCategoryNode,
} from "@/lib/ralex-categories";

type Props = {
  writable: boolean;
  initial: RalexCategoriesFile;
};

const adminFetchInit: RequestInit = { credentials: "include", cache: "no-store" };

function CategoryRow({
  node,
  depth,
  writable,
  busyImportId,
  bulkRunning,
  onImport,
}: {
  node: RalexCategoryNode;
  depth: number;
  writable: boolean;
  busyImportId: number | null;
  bulkRunning: boolean;
  onImport: (id: number) => void;
}) {
  const label = formatRalexCategoryName(node.name);
  const busy = busyImportId === node.id;
  const importDone = isRalexCategoryImportComplete(node);
  const importDisabled = !writable || importDone || busy || (bulkRunning && !busy);

  return (
    <li
      className={`admin-cat-row${importDone ? " admin-cat-row--complete" : ""}`}
      style={{ paddingLeft: depth === 0 ? 0 : 12 + depth * 10 }}
    >
      <div className="admin-cat-row-inner">
        <div className="admin-cat-meta">
          <span className="admin-cat-name" title={categoryShopHref(node.slug)}>
            {label}
          </span>
          <span className="admin-cat-id">ID {node.id}</span>
          <span className="admin-cat-count">{node.count} products</span>
          <a href={categoryShopHref(node.slug)} className="admin-cat-ext">
            Shop →
          </a>
        </div>
        <button
          type="button"
          className={
            importDone ? "admin-cat-import admin-cat-import--done" : "admin-btn-primary admin-cat-import"
          }
          disabled={importDisabled}
          onClick={() => onImport(node.id)}
        >
          {importDone ? "Imported" : busy ? "Working…" : "Import"}
        </button>
      </div>
      {node.children?.length ? (
        <ul className="admin-cat-sub">
          {node.children.map((ch) => (
            <CategoryRow
              key={ch.id}
              node={ch}
              depth={depth + 1}
              writable={writable}
              busyImportId={busyImportId}
              bulkRunning={bulkRunning}
              onImport={onImport}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function parseCategoriesResponse(raw: unknown): RalexCategoriesFile | null {
  if (!raw || typeof raw !== "object" || !("tree" in raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const { ok: _ok, patched: _patched, error: _err, ...rest } = o;
  if (!Array.isArray((rest as RalexCategoriesFile).tree)) {
    return null;
  }
  return rest as RalexCategoriesFile;
}

export default function AdminRalexImportSection({ writable, initial }: Props) {
  const [data, setData] = useState<RalexCategoriesFile>(initial);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [busyImportId, setBusyImportId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "complete">("all");

  const appendLog = useCallback((line: string) => {
    const stamp = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setImportLog((prev) => {
      const next = [...prev, `${stamp}  ${line}`];
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);

  const flat = useMemo(() => flattenRalexCategoryTree(data.tree), [data.tree]);

  const stats = useMemo(() => {
    const complete = flat.filter((n) => isRalexCategoryImportComplete(n)).length;
    const pending = flat.length - complete;
    return { complete, pending, total: flat.length };
  }, [flat]);

  const fetchedLabel = useMemo(() => {
    try {
      return new Date(data.fetchedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return data.fetchedAt;
    }
  }, [data.fetchedAt]);

  const filteredTree = useMemo(() => {
    if (filter === "all") {
      return data.tree;
    }
    const keep = (node: RalexCategoryNode): RalexCategoryNode | null => {
      const done = isRalexCategoryImportComplete(node);
      const children = (node.children ?? [])
        .map((ch) => keep(ch))
        .filter((ch): ch is RalexCategoryNode => ch != null);
      if (filter === "complete") {
        if (done || children.length > 0) {
          return { ...node, children };
        }
        return null;
      }
      if (!done || children.length > 0) {
        return { ...node, children };
      }
      return null;
    };
    return data.tree.map((n) => keep(n)).filter((n): n is RalexCategoryNode => n != null);
  }, [data.tree, filter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/categories/reconcile-markers", {
          method: "POST",
          ...adminFetchInit,
        });
        if (!res.ok || cancelled) {
          return;
        }
        const body = (await res.json()) as unknown;
        const file = parseCategoriesResponse(body);
        if (file && !cancelled) {
          setData(file);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSync = useCallback(async () => {
    setSyncErr(null);
    setSyncBusy(true);
    try {
      const res = await fetch("/api/admin/categories", { method: "POST", ...adminFetchInit });
      const body = (await res.json()) as RalexCategoriesFile | { error?: string };
      if (!res.ok) {
        setSyncErr("error" in body ? String(body.error) : `HTTP ${res.status}`);
        return;
      }
      if ("tree" in body) {
        setData(body);
        try {
          const rec = await fetch("/api/admin/categories/reconcile-markers", {
            method: "POST",
            ...adminFetchInit,
          });
          if (rec.ok) {
            const raw = await rec.json();
            const file = parseCategoriesResponse(raw);
            if (file) {
              setData(file);
            }
          }
        } catch {
          /* optional */
        }
      }
    } catch (e) {
      setSyncErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSyncBusy(false);
    }
  }, []);

  const refreshCategories = useCallback(
    async (opts?: { silent?: boolean }): Promise<RalexCategoriesFile | null> => {
      const refresh = await fetch("/api/admin/categories", adminFetchInit);
      if (!refresh.ok) {
        return null;
      }
      const refreshed = parseCategoriesResponse(await refresh.json());
      if (refreshed && !opts?.silent) {
        setData(refreshed);
      }
      return refreshed;
    },
    [],
  );

  const onImport = useCallback(
    async (categoryId: number) => {
      setImportErr(null);
      setImportMsg(null);
      setBusyImportId(categoryId);
      try {
        const res = await fetch(`/api/admin/categories/${categoryId}/import-products`, {
          method: "POST",
          ...adminFetchInit,
        });
        const body = (await res.json()) as {
          ok?: boolean;
          imported?: number;
          categoryLabel?: string;
          pagesFetched?: number;
          importComplete?: boolean;
          error?: string;
        };
        if (!res.ok) {
          setImportErr(body.error ?? `HTTP ${res.status}`);
          return;
        }
        if (body.ok && typeof body.imported === "number") {
          setImportMsg(
            `${body.imported} products imported for “${body.categoryLabel ?? categoryId}” (${body.pagesFetched ?? "?"} API page(s)).`,
          );
        }
        await refreshCategories();
      } catch (e) {
        setImportErr(e instanceof Error ? e.message : "Network error");
      } finally {
        setBusyImportId(null);
      }
    },
    [refreshCategories],
  );

  const onStartBulkImport = useCallback(async () => {
    if (!writable || bulkBusy || syncBusy) {
      return;
    }
    setImportErr(null);
    setImportMsg(null);
    setImportLog([]);
    setBulkBusy(true);
    appendLog("Bulk import started.");

    let tree = data.tree;
    try {
      const rec = await fetch("/api/admin/categories/reconcile-markers", { method: "POST", ...adminFetchInit });
      if (rec.ok) {
        const raw = (await rec.json()) as unknown;
        const patched =
          raw && typeof raw === "object" && "patched" in raw && typeof (raw as { patched: unknown }).patched === "number"
            ? (raw as { patched: number }).patched
            : 0;
        const file = parseCategoriesResponse(raw);
        if (file) {
          setData(file);
          tree = file.tree;
          appendLog(`Reconcile: ${patched} marker(s) updated.`);
        }
      }
    } catch {
      appendLog("Reconcile skipped (error).");
    }

    const order = flattenRalexCategoryTree(tree);
    appendLog(`${order.filter((n) => !isRalexCategoryImportComplete(n)).length} categories pending at start.`);

    const errorSkip = new Set<number>();
    let round = 0;
    const maxRounds = 80;

    try {
      while (round < maxRounds) {
        round++;
        const file = await refreshCategories({ silent: true });
        if (!file) {
          appendLog("Could not refresh categories — stopped.");
          setImportErr("Failed to refresh categories");
          break;
        }
        const batch = flattenRalexCategoryTree(file.tree).filter(
          (n) => !isRalexCategoryImportComplete(n) && !errorSkip.has(n.id),
        );
        if (batch.length === 0) {
          setData(file);
          appendLog(errorSkip.size > 0 ? `Done with ${errorSkip.size} skipped after API errors.` : "Done: all complete.");
          setImportMsg(errorSkip.size > 0 ? `${errorSkip.size} API error(s); see log.` : "All categories processed.");
          break;
        }

        appendLog(`Round ${round}: ${batch.length} category(s).`);
        for (const node of batch) {
          const name = formatRalexCategoryName(node.name);
          appendLog(`→ ID ${node.id} — ${name}`);
          setBusyImportId(node.id);
          try {
            const res = await fetch(`/api/admin/categories/${node.id}/import-products`, {
              method: "POST",
              ...adminFetchInit,
            });
            const body = (await res.json()) as { ok?: boolean; imported?: number; error?: string };
            if (!res.ok) {
              appendLog(`ERROR ID ${node.id}: ${body.error ?? res.status}`);
              errorSkip.add(node.id);
              setBusyImportId(null);
              continue;
            }
            appendLog(`✓ ID ${node.id}: ${body.imported ?? "?"} products.`);
          } catch (err) {
            appendLog(`Network ID ${node.id}: ${err instanceof Error ? err.message : String(err)}`);
            errorSkip.add(node.id);
          }
          setBusyImportId(null);
        }

        const fileAfter = await refreshCategories({ silent: true });
        if (fileAfter) {
          setData(fileAfter);
        }
      }
      if (round >= maxRounds) {
        appendLog(`Stop: max ${maxRounds} rounds.`);
      }
      appendLog("Bulk import finished.");
    } catch (e) {
      appendLog(`Unexpected: ${e instanceof Error ? e.message : String(e)}`);
      setImportErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBulkBusy(false);
      setBusyImportId(null);
      await refreshCategories();
    }
  }, [writable, bulkBusy, syncBusy, data.tree, appendLog, refreshCategories]);

  return (
    <div className="admin-import-source-body">
      {!writable ? (
        <div className="admin-banner warn" role="status">
          <strong>Read-only.</strong> Import requires <code>DATABASE_URL</code> in <code>.env.local</code>.
        </div>
      ) : null}

      {syncErr ? (
        <div className="admin-banner err" role="alert">
          {syncErr}
        </div>
      ) : null}
      {importErr ? (
        <div className="admin-banner err" role="alert">
          {importErr}
        </div>
      ) : null}
      {importMsg ? (
        <div className="admin-banner ok" role="status">
          {importMsg}
        </div>
      ) : null}

      <div className="admin-import-layout">
        <aside className="admin-import-aside admin-stack-tight">
          <div className="admin-panel admin-stack-tight">
            <h3 className="admin-panel-title admin-m-0">Ralex</h3>
            <p className="admin-muted admin-m-0">WooCommerce Store API — category tree and product import.</p>
            <dl className="admin-import-meta-list">
              <div>
                <dt>Last sync</dt>
                <dd>{fetchedLabel}</dd>
              </div>
              <div>
                <dt>Categories</dt>
                <dd>{stats.total}</dd>
              </div>
              <div>
                <dt>Complete</dt>
                <dd className="admin-import-meta-ok">{stats.complete}</dd>
              </div>
              <div>
                <dt>Pending</dt>
                <dd className={stats.pending > 0 ? "admin-import-meta-warn" : undefined}>{stats.pending}</dd>
              </div>
            </dl>
            <div className="admin-import-toolbar">
              <button
                type="button"
                className="admin-btn-primary admin-btn-block"
                disabled={!writable || syncBusy || bulkBusy}
                onClick={onStartBulkImport}
              >
                {bulkBusy ? "Importing…" : "Run all pending"}
              </button>
              <button
                type="button"
                className="admin-btn-secondary admin-btn-block"
                disabled={!writable || syncBusy || bulkBusy}
                onClick={onSync}
              >
                {syncBusy ? "Syncing…" : "Sync category tree"}
              </button>
            </div>
          </div>

          <details className="admin-panel admin-import-details">
            <summary className="admin-import-details-summary">How this source works</summary>
            <ul className="admin-import-help-list">
              <li>Fetches the category structure from the Ralex WooCommerce site.</li>
              <li>Imports products via the public Store API (no HTML scraping).</li>
              <li>
                <strong>Run all pending</strong> processes incomplete categories in rounds until done or stalled.
              </li>
              <li>Green rows match the source product count; markers reconcile on page load.</li>
            </ul>
          </details>

          {importLog.length > 0 || bulkBusy ? (
            <div className="admin-panel admin-import-log-wrap">
              <p className="admin-import-log-title">
                <strong>Activity log</strong>
              </p>
              <pre className="admin-import-log" role="log">
                {importLog.length > 0 ? importLog.join("\n") : "…"}
              </pre>
            </div>
          ) : null}
        </aside>

        <div className="admin-import-main admin-stack-tight">
          <div className="admin-panel admin-stack-tight">
            <div className="admin-import-main-head">
              <h3 className="admin-panel-title admin-m-0">Category tree</h3>
              <div className="admin-pill-row">
                <span className="admin-pill-row-label">Show</span>
                <button
                  type="button"
                  className={`admin-pill${filter === "all" ? " active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All ({stats.total})
                </button>
                <button
                  type="button"
                  className={`admin-pill${filter === "pending" ? " active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  Pending ({stats.pending})
                </button>
                <button
                  type="button"
                  className={`admin-pill${filter === "complete" ? " active" : ""}`}
                  onClick={() => setFilter("complete")}
                >
                  Complete ({stats.complete})
                </button>
              </div>
            </div>
            <p className="admin-muted admin-m-0">
              Source: {data.source} · API: {data.sourceApi}
            </p>
          </div>

          <div className="admin-panel">
            {filteredTree.length === 0 ? (
              <p className="admin-muted admin-m-0">No categories match this filter.</p>
            ) : (
              <ul className="admin-cat-root">
                {filteredTree.map((node) => (
                  <CategoryRow
                    key={node.id}
                    node={node}
                    depth={0}
                    writable={writable}
                    busyImportId={busyImportId}
                    bulkRunning={bulkBusy}
                    onImport={onImport}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
