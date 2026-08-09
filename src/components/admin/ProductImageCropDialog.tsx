import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getCroppedImageBlob } from "@/lib/crop-image";

interface ProductImageCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File) => Promise<void>;
  /** Relación de aspecto del recorte (ancho/alto). Por defecto 1 (cuadrado). */
  aspect?: number;
  title?: string;
  /** Lado mayor máximo del resultado en píxeles. */
  maxOutputSize?: number;
}

const ProductImageCropDialog = ({
  open,
  imageSrc,
  onOpenChange,
  onCropped,
  aspect = 1,
  title = "Recortar imagen",
  maxOutputSize = 1600,
}: ProductImageCropDialogProps) => {
  const { toast } = useToast();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const resetCropState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    if (!next) resetCropState();
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const { blob, extension, mimeType } = await getCroppedImageBlob(
        imageSrc,
        croppedAreaPixels,
        maxOutputSize,
      );
      const file = new File([blob], `crop-${Date.now()}.${extension}`, { type: mimeType });
      await onCropped(file);
      resetCropState();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo aplicar el recorte.";
      toast({ title: "Error al recortar", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-cream sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-playfair text-lg text-carbon">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted sm:h-80">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
            />
          ) : null}
        </div>

        <p className="text-xs text-carbon/40">
          Arrastra la imagen y usa el zoom para elegir la zona visible.
        </p>

        <div className="space-y-2 pt-1">
          <Label className="text-carbon/70 text-xs uppercase tracking-wider">Zoom</Label>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(value) => setZoom(value[0] ?? 1)}
            disabled={saving}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => handleOpenChange(false)}
            className="border-gold/20"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !croppedAreaPixels}
            onClick={() => void handleConfirm()}
            className="bg-gold hover:bg-gold/90 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Aplicar recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductImageCropDialog;
