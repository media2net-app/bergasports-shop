"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

import type { AdminUploadFolder } from "@/components/admin/admin-media";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXT = /\.(jpe?g|png|webp|gif)$/i;
const TYPE_ERROR = "Alleen JPG, PNG, WebP of GIF toegestaan.";

type FileProgress = {
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
};

export type AdminImageUploadControlProps = {
  label: string;
  folder?: AdminUploadFolder;
  className?: string;
  variant?: "button" | "dropzone" | "toolbar";
  onUploaded: (url: string, alt?: string | null) => void;
  onError?: (message: string) => void;
  onBatchComplete?: () => void;
  multiple?: boolean;
};

function isAllowedImage(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) {
    return true;
  }
  return ALLOWED_EXT.test(file.name);
}

function filesFromList(list: FileList | File[] | null): File[] {
  if (!list) {
    return [];
  }
  return Array.from(list);
}

function filesFromDataTransfer(data: DataTransfer | null): File[] {
  if (!data) {
    return [];
  }
  if (data.files?.length) {
    return Array.from(data.files);
  }
  const out: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") {
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      out.push(file);
    }
  }
  return out;
}

function hasFilePayload(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export default function AdminImageUploadControl({
  label,
  folder = "uploads",
  className,
  variant = "button",
  onUploaded,
  onError,
  onBatchComplete,
  multiple = false,
}: AdminImageUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [statusLine, setStatusLine] = useState("");

  const isDropzone = variant === "dropzone";
  const isToolbar = variant === "toolbar";
  const buttonClass = className ?? (isToolbar ? "admin-html-editor-btn" : "admin-btn-secondary");

  function openFileDialog() {
    if (busy) {
      return;
    }
    inputRef.current?.click();
  }

  function clearDrag() {
    dragCountRef.current = 0;
    setDragOver(false);
  }

  function onDragEnter(event: DragEvent) {
    if (!hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current += 1;
    setDragOver(true);
  }

  function onDragOver(event: DragEvent) {
    if (!hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event: DragEvent) {
    if (!hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current = Math.max(0, dragCountRef.current - 1);
    if (dragCountRef.current === 0) {
      setDragOver(false);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    clearDrag();
    if (busy) {
      return;
    }
    void uploadFiles(filesFromDataTransfer(event.dataTransfer));
  }

  function onDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFileDialog();
    }
  }

  async function uploadFiles(incoming: FileList | File[] | null) {
    let files = filesFromList(incoming);
    if (!files.length) {
      return;
    }
    if (!multiple) {
      files = files.slice(0, 1);
    }

    setBusy(true);
    setProgress(files.map((file) => ({ name: file.name, status: "uploading" as const })));
    onError?.("");

    const errors: string[] = [];
    let doneCount = 0;

    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (!file) {
          continue;
        }
        setStatusLine(`Uploaden… ${i + 1} van ${files.length}`);
        setProgress((prev) =>
          prev.map((item, index) => (index === i ? { ...item, status: "uploading" } : item)),
        );

        if (!isAllowedImage(file)) {
          const message = TYPE_ERROR;
          errors.push(`${file.name}: ${message}`);
          setProgress((prev) =>
            prev.map((item, index) =>
              index === i ? { ...item, status: "error", error: message } : item,
            ),
          );
          continue;
        }

        try {
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
          doneCount += 1;
          onUploaded(data.url);
          setProgress((prev) =>
            prev.map((item, index) => (index === i ? { ...item, status: "done" } : item)),
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : "Upload mislukt";
          errors.push(`${file.name}: ${message}`);
          setProgress((prev) =>
            prev.map((item, index) =>
              index === i ? { ...item, status: "error", error: message } : item,
            ),
          );
        }
      }

      if (errors.length) {
        onError?.(errors.join(" · "));
      }
      if (doneCount > 0) {
        onBatchComplete?.();
      }
    } finally {
      setBusy(false);
      setStatusLine("");
      if (!isDropzone) {
        setProgress([]);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      multiple={multiple}
      className="admin-sr-only"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => void uploadFiles(e.target.files)}
    />
  );

  const dragHandlers = {
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  };

  if (isDropzone) {
    const dropClass = [
      "admin-dropzone",
      dragOver ? "is-dragover" : "",
      busy ? "is-busy" : "",
      className && className !== "admin-btn-secondary" ? className : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="admin-dropzone-wrap">
        {fileInput}
        <div
          className={dropClass}
          role="button"
          tabIndex={0}
          aria-busy={busy}
          aria-label={label}
          onClick={openFileDialog}
          onKeyDown={onDropzoneKeyDown}
          {...dragHandlers}
        >
          <p className="admin-dropzone-title">{label}</p>
          <p className="admin-dropzone-hint">JPG, PNG, WebP of GIF</p>
          {busy || statusLine ? (
            <p className="admin-dropzone-hint">{statusLine || "Uploaden…"}</p>
          ) : null}
          {progress.length > 0 ? (
            <ul className="admin-dropzone-progress">
              {progress.map((item, index) => (
                <li key={`${index}-${item.name}`} className={item.status === "error" ? "is-error" : ""}>
                  <span>{item.name}</span>
                  <span>
                    {item.status === "uploading"
                      ? "Bezig…"
                      : item.status === "done"
                        ? "Klaar"
                        : (item.error ?? "Mislukt")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  const wrapClass = ["admin-image-upload", dragOver ? "is-dragover" : ""].filter(Boolean).join(" ");
  const btnClass = [buttonClass, dragOver ? "is-dragover" : ""].filter(Boolean).join(" ");

  return (
    <>
      {fileInput}
      {isToolbar ? (
        <button
          type="button"
          className={btnClass}
          disabled={busy}
          title="Klik om een afbeelding te kiezen"
          onClick={openFileDialog}
        >
          {busy ? statusLine || "Uploaden…" : label}
        </button>
      ) : (
        <span className={wrapClass} title="Sleep een afbeelding hierheen of klik om te kiezen" {...dragHandlers}>
          <button type="button" className={btnClass} disabled={busy} onClick={openFileDialog}>
            {busy ? statusLine || "Uploaden…" : label}
          </button>
        </span>
      )}
    </>
  );
}
