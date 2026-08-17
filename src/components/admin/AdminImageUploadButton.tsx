"use client";

import { useRef, useState } from "react";

type AdminImageUploadButtonProps = {
  label: string;
  folder?: "products" | "pages" | "uploads";
  className?: string;
  onUploaded: (url: string) => void;
  onError?: (message: string) => void;
  multiple?: boolean;
};

export default function AdminImageUploadButton({
  label,
  folder = "uploads",
  className = "admin-btn-secondary",
  onUploaded,
  onError,
  multiple = false,
}: AdminImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        body.set("folder", folder);
        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Upload mislukt");
        }
        onUploaded(data.url);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload mislukt";
      onError?.(message);
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void uploadFiles(e.target.files)}
      />
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploaden…" : label}
      </button>
    </>
  );
}
