import { useState, useCallback } from "react";
import { ImageCropDialog, type AspectKey } from "@/components/admin/ImageCropDialog";
import { toast } from "sonner";

interface UseImageCropOptions {
  defaultAspect?: AspectKey;
  allowedAspects?: AspectKey[];
  title?: string;
  /** Maksimum ukuran file dalam MB (default 5) */
  maxSizeMB?: number;
  /** MIME types yang diizinkan (default jpg/png/webp) */
  allowedTypes?: string[];
}

const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function formatTypes(types: string[]) {
  return types
    .map((t) => t.replace("image/", "").toUpperCase())
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");
}

/**
 * Hook untuk pipeline upload gambar admin dengan crop interaktif.
 * Memvalidasi ukuran file & format sebelum membuka dialog crop.
 */
export function useImageCrop(
  options: UseImageCropOptions,
  onConfirm: (croppedFile: File) => void | Promise<void>,
) {
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const maxSizeMB = options.maxSizeMB ?? 5;
  const allowedTypes = options.allowedTypes ?? DEFAULT_ALLOWED_TYPES;

  const pickFile = useCallback((f: File | null | undefined) => {
    if (!f) return;

    // Validasi format
    const type = (f.type || "").toLowerCase();
    if (!allowedTypes.includes(type)) {
      toast.error(`Format tidak didukung. Hanya ${formatTypes(allowedTypes)} yang diizinkan.`);
      return;
    }

    // Validasi ukuran
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (f.size > maxBytes) {
      const sizeMB = (f.size / (1024 * 1024)).toFixed(2);
      toast.error(`Ukuran file terlalu besar (${sizeMB}MB). Maksimum ${maxSizeMB}MB.`);
      return;
    }

    setFile(f);
    setOpen(true);
  }, [allowedTypes, maxSizeMB]);

  const dialog = (
    <ImageCropDialog
      file={file}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setFile(null);
      }}
      defaultAspect={options.defaultAspect}
      allowedAspects={options.allowedAspects}
      title={options.title}
      onCropped={async (_blob, croppedFile) => {
        await onConfirm(croppedFile);
      }}
    />
  );

  return { pickFile, dialog };
}
