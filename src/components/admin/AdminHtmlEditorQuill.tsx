"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import Quill from "quill";

import AdminImageUploadButton from "@/components/admin/AdminImageUploadButton";
import { sanitizeAdminHtml } from "@/lib/admin-html";

export type AdminHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  placeholder?: string;
  minHeight?: "compact" | "default" | "tall";
  imageFolder?: "products" | "pages" | "uploads";
  onImageError?: (message: string) => void;
};

const QUILL_FORMATS = ["bold", "italic", "header", "list", "blockquote", "link", "image"];

function htmlFromQuill(quill: Quill): string {
  return sanitizeAdminHtml(quill.getSemanticHTML());
}

function applyHtml(quill: Quill, html: string) {
  const delta = quill.clipboard.convert({ html: html || "" });
  quill.setContents(delta, "silent");
}

function insertImage(quill: Quill, url: string) {
  const src = url.trim();
  if (!src) return;
  const range = quill.getSelection(true);
  const index = range?.index ?? quill.getLength();
  quill.insertEmbed(index, "image", src, "user");
  quill.setSelection(index + 1, 0, "silent");
}

function labelToolbar(toolbar: HTMLElement) {
  for (const button of toolbar.querySelectorAll<HTMLButtonElement>("button[data-label]")) {
    const label = button.getAttribute("data-label")?.trim();
    if (!label) continue;
    button.replaceChildren(label);
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }
}

function localizeLinkTooltip(quill: Quill) {
  const tooltip = (quill.theme as { tooltip?: { textbox: HTMLInputElement | null; root: HTMLElement } }).tooltip;
  if (!tooltip) return;
  tooltip.textbox?.setAttribute("placeholder", "https://");
}

function ToolbarButtons({ full }: { full: boolean }) {
  return (
    <>
      {full ? (
        <>
          <button type="button" className="ql-header" value="1" data-label="H1">
            H1
          </button>
          <button type="button" className="ql-header" value="2" data-label="H2">
            H2
          </button>
          <button type="button" className="ql-header" value="3" data-label="H3">
            H3
          </button>
        </>
      ) : (
        <button type="button" className="ql-header" value="2" data-label="Kop">
          Kop
        </button>
      )}
      <button type="button" className="ql-bold" data-label="Vet">
        Vet
      </button>
      <button type="button" className="ql-italic" data-label="Cursief">
        Cursief
      </button>
      <button type="button" className="ql-list" value="bullet" data-label="Lijst">
        Lijst
      </button>
      {full ? (
        <>
          <button type="button" className="ql-list" value="ordered" data-label="Nr.">
            Nr.
          </button>
          <button type="button" className="ql-blockquote" data-label="Citaat">
            Citaat
          </button>
        </>
      ) : null}
      <button type="button" className="ql-link" data-label="Link">
        Link
      </button>
      <button type="button" className="ql-image" data-label="Foto">
        Foto
      </button>
    </>
  );
}

export default function AdminHtmlEditorQuill({
  value,
  onChange,
  id,
  placeholder = "Typ hier…",
  minHeight = "default",
  imageFolder,
  onImageError,
}: AdminHtmlEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const lastEmitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const placeholderRef = useRef(placeholder);
  const idRef = useRef(id);
  const isFull = minHeight !== "compact";

  onChangeRef.current = onChange;
  placeholderRef.current = placeholder;
  idRef.current = id;

  const insertUploadedImage = useCallback((url: string) => {
    const quill = quillRef.current;
    if (!quill) return;
    insertImage(quill, url);
  }, []);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const toolbar = toolbarRef.current;
    const host = hostRef.current;
    if (!wrap || !toolbar || !host) return;

    const quill = new Quill(host, {
      theme: "snow",
      placeholder: placeholderRef.current,
      bounds: wrap,
      formats: QUILL_FORMATS,
      modules: {
        toolbar: {
          container: toolbar,
          handlers: {
            image() {
              const editor = quillRef.current;
              if (!editor) return;
              const src = window.prompt("Afbeelding-URL", "https://");
              if (!src?.trim()) return;
              insertImage(editor, src.trim());
            },
          },
        },
        clipboard: {
          matchVisual: false,
        },
      },
    });

    quillRef.current = quill;
    labelToolbar(toolbar);
    localizeLinkTooltip(quill);
    if (idRef.current) quill.root.id = idRef.current;

    applyHtml(quill, value);
    lastEmitted.current = value;

    const onTextChange = () => {
      const html = htmlFromQuill(quill);
      lastEmitted.current = html;
      onChangeRef.current(html);
    };
    quill.on(Quill.events.TEXT_CHANGE, onTextChange);

    return () => {
      quill.off(Quill.events.TEXT_CHANGE, onTextChange);
      quillRef.current = null;
      host.replaceChildren();
      host.removeAttribute("class");
      host.className = "admin-html-editor-surface";
      toolbar.querySelectorAll("svg").forEach((svg) => svg.remove());
    };
    // Quill is created once; value/placeholder/id sync in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    if (lastEmitted.current !== null && value === lastEmitted.current) return;
    lastEmitted.current = value;
    applyHtml(quill, value);
  }, [value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    quill.root.dataset.placeholder = placeholder;
    if (id) {
      quill.root.id = id;
    } else {
      quill.root.removeAttribute("id");
    }
  }, [id, placeholder]);

  return (
    <div ref={wrapRef} className={`admin-html-editor admin-html-editor--${minHeight}`}>
      <div className="admin-html-editor-toolbar" role="toolbar" aria-label="Tekstopmaak">
        <div ref={toolbarRef} className="admin-html-editor-toolbar-quill">
          <ToolbarButtons full={isFull} />
        </div>
        {imageFolder ? (
          <AdminImageUploadButton
            label="Uploaden"
            libraryLabel="Bibliotheek"
            folder={imageFolder}
            variant="toolbar"
            onUploaded={insertUploadedImage}
            onError={onImageError}
          />
        ) : null}
      </div>
      <div ref={hostRef} className="admin-html-editor-surface" />
    </div>
  );
}
