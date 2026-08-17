"use client";

import { useState, type ComponentType } from "react";

import type { AdminUploadFolder } from "@/components/admin/admin-media";
import AdminImageUploadControl, {
  type AdminImageUploadControlProps,
} from "@/components/admin/AdminImageUploadControl";

type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt?: string | null) => void;
  folder?: AdminUploadFolder;
};

type AdminImageUploadButtonProps = AdminImageUploadControlProps & {
  showLibrary?: boolean;
  libraryLabel?: string;
};

export default function AdminImageUploadButton({
  showLibrary,
  libraryLabel = "Kies uit bibliotheek",
  ...uploadProps
}: AdminImageUploadButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [Picker, setPicker] = useState<ComponentType<MediaPickerProps> | null>(null);
  const withLibrary = showLibrary ?? uploadProps.variant !== "dropzone";
  const buttonClass =
    uploadProps.className ?? (uploadProps.variant === "toolbar" ? "admin-html-editor-btn" : "admin-btn-secondary");

  async function openLibrary() {
    if (!Picker) {
      const mod = await import("@/components/admin/AdminMediaPicker");
      setPicker(() => mod.default);
    }
    setPickerOpen(true);
  }

  return (
    <>
      <AdminImageUploadControl {...uploadProps} />
      {withLibrary ? (
        <button type="button" className={buttonClass} onClick={() => void openLibrary()}>
          {libraryLabel}
        </button>
      ) : null}
      {pickerOpen && Picker ? (
        <Picker
          open
          folder={uploadProps.folder}
          onClose={() => setPickerOpen(false)}
          onSelect={(url, alt) => {
            uploadProps.onUploaded(url, alt);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
