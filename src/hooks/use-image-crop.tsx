import { useState, useCallback } from "react";
import { ImageCropDialog, type AspectKey } from "@/components/admin/ImageCropDialog";

interface UseImageCropOptions {
  defaultAspect?: AspectKey;
  allowedAspects?: AspectKey[];
  title?: string;
}

/**
 * Hook untuk pipeline upload gambar admin dengan crop interaktif.
 * Pakai: const { pickFile, dialog } = useImageCrop({ defaultAspect: "1:1" }, async (croppedFile) => { await upload(croppedFile); });
 */
export function useImageCrop(
  options: UseImageCropOptions,
  onConfirm: (croppedFile: File) => void | Promise<void>,
) {
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const pickFile = useCallback((f: File | null | undefined) => {
    if (!f) return;
    setFile(f);
    setOpen(true);
  }, []);

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
