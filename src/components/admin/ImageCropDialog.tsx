import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2 } from "lucide-react";

export type AspectKey = "1:1" | "4:3" | "3:4" | "16:9";

const ASPECTS: { key: AspectKey; label: string; value: number }[] = [
  { key: "1:1", label: "1:1", value: 1 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "3:4", label: "3:4", value: 3 / 4 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
];

interface ImageCropDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropped: (blob: Blob, file: File) => void | Promise<void>;
  defaultAspect?: AspectKey;
  allowedAspects?: AspectKey[];
  title?: string;
}

async function getCroppedBlob(imageSrc: string, area: Area, mimeType: string): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Gagal membuat gambar"));
    }, mimeType, quality);
  });
}

// Output WebP @ 0.85 untuk hemat storage tanpa perubahan visual yang terlihat
const OUTPUT_MIME = "image/webp";
const OUTPUT_QUALITY = 0.85;
const OUTPUT_EXT = "webp";

export function ImageCropDialog({
  file,
  open,
  onOpenChange,
  onCropped,
  defaultAspect = "1:1",
  allowedAspects = ["1:1", "4:3", "3:4", "16:9"],
  title = "Atur potongan gambar",
}: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectKey, setAspectKey] = useState<AspectKey>(defaultAspect);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspectKey(defaultAspect);
    return () => URL.revokeObjectURL(url);
  }, [file, defaultAspect]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const aspect = ASPECTS.find((a) => a.key === aspectKey)?.value ?? 1;
  const visibleAspects = ASPECTS.filter((a) => allowedAspects.includes(a.key));

  const handleSave = async () => {
    if (!imageSrc || !croppedArea || !file) return;
    setSaving(true);
    try {
      const mime = file.type || "image/jpeg";
      const blob = await getCroppedBlob(imageSrc, croppedArea, mime);
      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
      const cropped = new File([blob], `${baseName}-${aspectKey.replace(":", "x")}.${ext}`, { type: mime });
      await onCropped(blob, cropped);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Geser & zoom area crop, pilih rasio aspek, lalu simpan untuk konsistensi tampilan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-secondary/40">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Rasio aspek</p>
            <ToggleGroup
              type="single"
              value={aspectKey}
              onValueChange={(v) => v && setAspectKey(v as AspectKey)}
              className="justify-start"
            >
              {visibleAspects.map((a) => (
                <ToggleGroupItem key={a.key} value={a.key} className="text-xs px-3">
                  {a.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => setZoom(v[0])} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || !croppedArea}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Simpan & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
