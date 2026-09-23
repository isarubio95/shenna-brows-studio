import { useCallback, useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getCroppedImageBlob } from "@/lib/crop-image";
import { isVideoMediaUrl } from "@/lib/media-url";
import { canTranscodeVideo } from "@/lib/optimize-video-upload";

export type CropMediaKind = "image" | "video";

export interface MediaCropResult {
  kind: CropMediaKind;
  /** En imagen, el archivo ya recortado. En vídeo es null: el recorte va en `crop`. */
  file: File | null;
  /**
   * En vídeo, el área recortada en píxeles del original; null cuando se sube
   * entero y es el banner el que se adapta a su proporción. En imagen siempre null.
   */
  crop: Area | null;
}

interface MediaCropDialogProps {
  open: boolean;
  /**
   * Origen a recortar: una URL (http o blob) de imagen o de vídeo. El tipo se
   * deduce de la extensión, salvo que se fuerce con `kind`.
   */
  src: string | null;
  kind?: CropMediaKind;
  onOpenChange: (open: boolean) => void;
  onCropped: (result: MediaCropResult) => Promise<void>;
  /** Relación de aspecto del recorte (ancho/alto). Por defecto 1 (cuadrado). */
  aspect?: number;
  title?: string;
  /** Lado mayor máximo del resultado en píxeles. Sólo aplica a imagen. */
  maxOutputSize?: number;
  /** Progreso del procesado del vídeo (0 a 1) mientras se aplica el recorte. */
  progress?: number | null;
  /**
   * Estado inicial de «subir el vídeo entero». Se activa donde el hueco se adapta
   * a la proporción del archivo (campaña, hero de tienda, sección de vídeo) y se
   * deja apagado donde el marco es fijo y hay que elegir el encuadre (portada a
   * pantalla completa, popup, galería de producto).
   */
  videoFullDefault?: boolean;
}

const MediaCropDialog = ({
  open,
  src,
  kind,
  onOpenChange,
  onCropped,
  aspect = 1,
  title,
  maxOutputSize = 1600,
  progress = null,
  videoFullDefault = false,
}: MediaCropDialogProps) => {
  const { toast } = useToast();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  /** Proporción del archivo, tal como la lee el propio recortador. */
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  /**
   * En vídeo se sube entero por defecto: recortarlo al hueco del banner es lo que
   * se lleva por delante la parte de arriba y la de abajo del original.
   */
  const [fullVideo, setFullVideo] = useState(videoFullDefault);

  const mediaKind: CropMediaKind = kind ?? (isVideoMediaUrl(src) ? "video" : "image");
  const isVideo = mediaKind === "video";
  const keepWholeVideo = isVideo && fullVideo;
  const canCropVideo = !isVideo || fullVideo || canTranscodeVideo();
  const cropAspect = keepWholeVideo ? naturalAspect ?? aspect : aspect;

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const resetCropState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setNaturalAspect(null);
    setFullVideo(videoFullDefault);
  };

  const onMediaLoaded = useCallback((media: { naturalWidth: number; naturalHeight: number }) => {
    const { naturalWidth: w, naturalHeight: h } = media;
    setNaturalAspect(w > 0 && h > 0 ? w / h : null);
  }, []);

  // Un origen nuevo invalida el encuadre anterior.
  useEffect(() => {
    if (open) resetCropState();
  }, [open, src]);

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    if (!next) resetCropState();
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!src) return;
    if (!croppedAreaPixels && !keepWholeVideo) return;
    setSaving(true);
    try {
      if (isVideo) {
        await onCropped({ kind: "video", file: null, crop: keepWholeVideo ? null : croppedAreaPixels });
      } else {
        const { blob, extension, mimeType } = await getCroppedImageBlob(
          src,
          croppedAreaPixels,
          maxOutputSize,
        );
        const file = new File([blob], `crop-${Date.now()}.${extension}`, { type: mimeType });
        await onCropped({ kind: "image", file, crop: null });
      }
      resetCropState();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo aplicar el recorte.";
      toast({ title: "Error al recortar", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const percent = progress === null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-cream sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-playfair text-lg text-carbon">
            {title ?? (isVideo ? "Recortar vídeo" : "Recortar imagen")}
          </DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted sm:h-80">
          {src ? (
            <Cropper
              {...(isVideo ? { video: src } : { image: src })}
              crop={crop}
              zoom={zoom}
              aspect={cropAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onMediaLoaded={onMediaLoaded}
              showGrid={!keepWholeVideo}
            />
          ) : null}
        </div>

        {isVideo ? (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5">
            <div className="space-y-1">
              <Label htmlFor="full-video" className="text-carbon text-sm font-medium">
                Subir el vídeo entero
              </Label>
              <p className="text-xs text-carbon/50">
                Se ve completo y el banner toma su proporción. Desactívalo para recortarlo al
                hueco del banner, que corta por arriba y por abajo.
              </p>
            </div>
            <Switch
              id="full-video"
              checked={fullVideo}
              onCheckedChange={setFullVideo}
              disabled={saving}
            />
          </div>
        ) : null}

        <p className="text-xs text-carbon/40">
          {isVideo
            ? keepWholeVideo
              ? "El vídeo se sube completo, sin recomprimir."
              : "Arrastra el vídeo y usa el zoom para elegir la zona visible. Al aplicar se vuelve a codificar."
            : "Arrastra la imagen y usa el zoom para elegir la zona visible."}
        </p>

        {isVideo && !canCropVideo && !keepWholeVideo ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Este navegador no puede recortar vídeo. Prueba con Chrome o Edge, o sube el vídeo ya
            recortado.
          </p>
        ) : null}

        {keepWholeVideo ? null : (
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
        )}

        <DialogFooter className="items-center gap-2 sm:gap-3">
          {saving && percent !== null ? (
            <span className="mr-auto text-xs text-carbon/50">Procesando vídeo… {percent}%</span>
          ) : null}
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
            disabled={saving || (!croppedAreaPixels && !keepWholeVideo) || !canCropVideo}
            onClick={() => void handleConfirm()}
            className="bg-gold hover:bg-gold/90 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {keepWholeVideo ? "Subir vídeo completo" : "Aplicar recorte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaCropDialog;
