const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "UL", "OL", "LI", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH", "FIGURE", "FIGCAPTION", "HR", "DIV"]);

const ALLOWED_TAGS = new Set([
  ...BLOCK_TAGS,
  "BR",
  "A",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "IMG",
  "SPAN",
  "SUB",
  "SUP",
]);

const STRIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
  "LINK",
  "META",
  "NOSCRIPT",
  "SVG",
  "VIDEO",
  "AUDIO",
  "SOURCE",
]);

function isSafeUrl(value: string, kind: "href" | "src"): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t.startsWith("/") || t.startsWith("#")) return true;
  if (kind === "href" && (t.startsWith("mailto:") || t.startsWith("tel:"))) return true;
  return /^https?:\/\//i.test(t);
}

function copyAllowedAttrs(from: Element, to: Element) {
  const tag = from.tagName;
  if (tag === "A") {
    const href = from.getAttribute("href") ?? "";
    if (isSafeUrl(href, "href")) {
      to.setAttribute("href", href.trim());
    }
    const target = from.getAttribute("target");
    if (target === "_blank") {
      to.setAttribute("target", "_blank");
      to.setAttribute("rel", "noopener noreferrer");
    }
  }
  if (tag === "IMG") {
    const src = from.getAttribute("src") ?? "";
    if (isSafeUrl(src, "src")) {
      to.setAttribute("src", src.trim());
    }
    const alt = from.getAttribute("alt");
    if (alt) to.setAttribute("alt", alt);
  }
  if (tag === "TD" || tag === "TH") {
    const colspan = from.getAttribute("colspan");
    const rowspan = from.getAttribute("rowspan");
    if (colspan) to.setAttribute("colspan", colspan);
    if (rowspan) to.setAttribute("rowspan", rowspan);
  }
}

function rewriteTag(tag: string): string {
  if (tag === "B") return "STRONG";
  if (tag === "I") return "EM";
  return tag;
}

function sanitizeNode(node: Node, doc: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ? [doc.createTextNode(node.textContent)] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }
  const el = node as Element;
  const tag = el.tagName;
  if (STRIP_TAGS.has(tag)) {
    return [];
  }

  const children: Node[] = [];
  for (const child of Array.from(el.childNodes)) {
    children.push(...sanitizeNode(child, doc));
  }

  if (tag === "BR") {
    return [doc.createElement("br")];
  }

  if (!ALLOWED_TAGS.has(tag)) {
    return children;
  }

  const nextTag = rewriteTag(tag);
  if (nextTag === "P" && children.length === 0) {
    return [];
  }

  const next = doc.createElement(nextTag.toLowerCase());
  copyAllowedAttrs(el, next);
  if (nextTag === "IMG" && !next.getAttribute("src")) {
    return [];
  }
  if (nextTag === "A" && !next.getAttribute("href")) {
    return children;
  }
  for (const child of children) {
    next.appendChild(child);
  }
  return [next];
}

export function sanitizeAdminHtml(html: string): string {
  const raw = html.trim();
  if (!raw) return "";
  if (typeof DOMParser === "undefined") return raw;
  const doc = new DOMParser().parseFromString(raw, "text/html");
  const out = doc.createElement("div");
  for (const child of Array.from(doc.body.childNodes)) {
    for (const node of sanitizeNode(child, doc)) {
      out.appendChild(node);
    }
  }
  return normalizeEmptyHtml(out.innerHTML);
}

export function normalizeEmptyHtml(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text ? html.trim() : "";
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isAdminHtmlEmpty(html: string): boolean {
  return !normalizeEmptyHtml(html);
}
