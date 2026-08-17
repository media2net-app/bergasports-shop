"use client";

import dynamic from "next/dynamic";

import type { AdminHtmlEditorProps } from "@/components/admin/AdminHtmlEditorQuill";

const AdminHtmlEditorQuill = dynamic(() => import("@/components/admin/AdminHtmlEditorQuill"), {
  ssr: false,
  loading: () => (
    <div className="admin-html-editor admin-html-editor--default" aria-hidden>
      <div className="admin-html-editor-toolbar">
        <span className="admin-html-editor-btn">H1</span>
        <span className="admin-html-editor-btn">H2</span>
        <span className="admin-html-editor-btn">H3</span>
        <span className="admin-html-editor-btn">Vet</span>
        <span className="admin-html-editor-btn">Cursief</span>
        <span className="admin-html-editor-btn">Lijst</span>
        <span className="admin-html-editor-btn">Nr.</span>
        <span className="admin-html-editor-btn">Citaat</span>
        <span className="admin-html-editor-btn">Link</span>
        <span className="admin-html-editor-btn">Foto</span>
      </div>
      <div className="admin-html-editor-surface" />
    </div>
  ),
});

export default function AdminHtmlEditor({ minHeight = "default", ...props }: AdminHtmlEditorProps) {
  return <AdminHtmlEditorQuill minHeight={minHeight} {...props} />;
}
