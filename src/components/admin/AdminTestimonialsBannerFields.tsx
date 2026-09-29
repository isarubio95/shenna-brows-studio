import { useRef, useState, type DragEvent } from "react";
import { Loader2, Monitor, RotateCcw, Smartphone, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AdminColorField } from "@/components/admin/HexColorField";
import { AdminTextFonts } from "@/components/admin/FontSelect";
import MediaCropDialog from "@/components/admin/MediaCropDialog";
import TestimonialsBanner from "@/components/TestimonialsBanner";
import {
  CampaignPreviewFrame,
  type CampaignPreviewDevice,
} from "@/components/CampaignBanner";
import { type OptimizeImageVariant } from "@/lib/optimize-image-upload";
import { CAMPAIGN_BUCKET, uploadMedia, uploadResultDescription } from "@/lib/upload-media";
import {
  DEFAULT_TESTIMONIALS_BANNER,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_WIDTH_MIN,
  clampTextBox,
  type TestimonialsBannerConfig,
} from "@/lib/testimonials-banner-content";
import { cn } from "@/lib/utils";

/** Proporción de las fotos de la sección (ver TestimonialsBanner). */
const ASPECT: Record<OptimizeImageVariant, number> = {
  desktop: 1552 / 563,
  mobile: 900 / 1600,
};

const VARIANT_LABEL: Record<OptimizeImageVariant, string> = {
  desktop: "escritorio/tablet",
  mobile: "móvil",
};

const IMAGE_FIELD: Record<OptimizeImageVariant, "desktopImageUrl" | "mobileImageUrl"> = {
  desktop: "desktopImageUrl",
  mobile: "mobileImageUrl",
};

type BoxFields = { x: "textPosX" | "textPosMobileX"; y: "textPosY" | "textPosMobileY"; width: "textWidth" | "textWidthMobile" };

const BOX_FIELDS: Record<CampaignPreviewDevice, BoxFields> = {
  desktop: { x: "textPosX", y: "textPosY", width: "textWidth" },
  mobile: { x: "textPosMobileX", y: "textPosMobileY", width: "textWidthMobile" },
};

const labelClass = "text-carbon/60 text-xs uppercase tracking-wider";
const inputClass = "mt-1 border-gold/20 focus-visible:ring-gold/30";

interface Props {
  value: TestimonialsBannerConfig;
  onChange: (update: (prev: TestimonialsBannerConfig) => TestimonialsBannerConfig) => void;
}

/** Campos del bloque «Testimonios» de la home en Admin → Contenido. */
const AdminTestimonialsBannerFields = ({ value, onChange }: Props) => {
  const { toast } = useToast();
  const [device, setDevice] = useState<CampaignPreviewDevice>("desktop");
  const [uploading, setUploading] = useState<OptimizeImageVariant | null>(null);
  const [dragOver, setDragOver] = useState<OptimizeImageVariant | null>(null);
  const [crop, setCrop] = useState<{ src: string; variant: OptimizeImageVariant } | null>(null);
  const inputRefs = {
    desktop: useRef<HTMLInputElement>(null),
    mobile: useRef<HTMLInputElement>(null),
  };

  const set = <K extends keyof TestimonialsBannerConfig>(key: K, next: TestimonialsBannerConfig[K]) =>
    onChange((prev) => ({ ...prev, [key]: next }));

  const openCrop = (file: File, variant: OptimizeImageVariant) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo no válido", description: "Selecciona una imagen.", variant: "destructive" });
      return;
    }
    if (crop) URL.revokeObjectURL(crop.src);
    setCrop({ src: URL.createObjectURL(file), variant });
  };

  const closeCrop = (open: boolean) => {
    if (open || !crop) return;
    URL.revokeObjectURL(crop.src);
    setCrop(null);
  };

  const upload = async (file: File, variant: OptimizeImageVariant) => {
    setUploading(variant);
    try {
      const result = await uploadMedia(file, {
        bucket: CAMPAIGN_BUCKET,
        pathPrefix: `testimonials-${variant}`,
        variant,
      });
      set(IMAGE_FIELD[variant], result.url);
      toast({
        title: "Imagen subida",
        description: `${uploadResultDescription(result, VARIANT_LABEL[variant])} Guarda para publicarla.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo subir el archivo.";
      toast({ title: "Error al subir", description: message, variant: "destructive" });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setUploading(null);
    }
  };

  const handleDrop = (e: DragEvent, variant: OptimizeImageVariant) => {
    e.preventDefault();
    setDragOver(null);
    if (uploading || crop) return;
    const file = Array.from(e.dataTransfer.files ?? []).find((f) => f.type.startsWith("image/"));
    if (file) openCrop(file, variant);
  };

  const box = BOX_FIELDS[device];
  const currentBox = clampTextBox(value[box.x], value[box.y], value[box.width]);
  const boxIsDefault =
    value[box.x] === DEFAULT_TESTIMONIALS_BANNER[box.x] &&
    value[box.y] === DEFAULT_TESTIMONIALS_BANNER[box.y] &&
    value[box.width] === DEFAULT_TESTIMONIALS_BANNER[box.width];

  const setBox = (next: Partial<{ x: number; y: number; width: number }>) =>
    onChange((prev) => {
      const b = clampTextBox(
        next.x ?? prev[box.x],
        next.y ?? prev[box.y],
        next.width ?? prev[box.width],
      );
      return { ...prev, [box.x]: b.x, [box.y]: b.y, [box.width]: b.width };
    });

  const dropzone = (variant: OptimizeImageVariant) => {
    const field = IMAGE_FIELD[variant];
    const src = value[field];
    const isDefault = src === DEFAULT_TESTIMONIALS_BANNER[field];
    const pick = () => {
      if (!uploading) inputRefs[variant].current?.click();
    };
    return (
      <div>
        <Label className={labelClass}>Foto · {VARIANT_LABEL[variant]}</Label>
        <input
          ref={inputRefs[variant]}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) openCrop(file, variant);
          }}
        />
        <div
          role="button"
          tabIndex={0}
          aria-label={`Cambiar foto de ${VARIANT_LABEL[variant]}`}
          onClick={pick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pick();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(variant);
          }}
          onDragLeave={() => setDragOver((prev) => (prev === variant ? null : prev))}
          onDrop={(e) => handleDrop(e, variant)}
          className={cn(
            "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-all duration-200",
            dragOver === variant ? "border-gold bg-gold/5 scale-[1.01]" : "border-gold/20 hover:border-gold/40",
            variant === "desktop" ? "aspect-[1552/563]" : "aspect-[900/1600] max-h-56 mx-auto",
          )}
        >
          <img src={src} alt="" className="h-full w-full object-cover" />
          {uploading === variant ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-carbon/0 text-white opacity-0 transition-opacity hover:bg-carbon/30 hover:opacity-100">
              <Upload className="h-6 w-6" aria-hidden />
              <span className="rounded-lg bg-carbon/60 px-3 py-1.5 text-xs">Cambiar foto</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDefault}
            onClick={() => set(field, DEFAULT_TESTIMONIALS_BANNER[field])}
            className="border-gold/20 text-carbon/60 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Foto original
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gold/15 bg-cream/40 px-4 py-3">
        <div>
          <Label htmlFor="testimonials-enabled" className="text-sm text-carbon">
            Mostrar en la página de inicio
          </Label>
          <p className="text-xs text-carbon/40">Si la apagas, la sección desaparece de la home.</p>
        </div>
        <Switch
          id="testimonials-enabled"
          checked={value.enabled}
          onCheckedChange={(checked) => set("enabled", checked)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        {dropzone("desktop")}
        {dropzone("mobile")}
      </div>
      <p className="text-xs text-carbon/30">
        Las fotos se recortan a la proporción de la sección y se convierten a WebP (máx. 1920px
        escritorio / 1080px móvil). Deja libre la zona donde irá el texto.
      </p>

      <div>
        <Label className={labelClass}>Texto alternativo</Label>
        <Input
          value={value.alt}
          onChange={(e) => set("alt", e.target.value)}
          placeholder="Vacío si la foto es decorativa"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className={labelClass}>Título</Label>
          <Input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={DEFAULT_TESTIMONIALS_BANNER.title}
            className={inputClass}
          />
        </div>
        <AdminColorField
          label="Color del título"
          value={value.titleColor}
          fallback={DEFAULT_TESTIMONIALS_BANNER.titleColor}
          onChange={(hex) => set("titleColor", hex)}
          ariaLabel="Color del título"
        />
        <div>
          <Label className={labelClass}>Subtítulo</Label>
          <Input
            value={value.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="Opcional"
            className={inputClass}
          />
        </div>
        <AdminColorField
          label="Color del subtítulo"
          value={value.subtitleColor}
          fallback={DEFAULT_TESTIMONIALS_BANNER.subtitleColor}
          onChange={(hex) => set("subtitleColor", hex)}
          ariaLabel="Color del subtítulo"
        />
        <AdminColorField
          label="Color de la línea"
          value={value.dividerColor}
          fallback={DEFAULT_TESTIMONIALS_BANNER.dividerColor}
          onChange={(hex) => set("dividerColor", hex)}
          ariaLabel="Color de la línea decorativa"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className={labelClass}>Texto del botón</Label>
          <Input
            value={value.ctaText}
            onChange={(e) => set("ctaText", e.target.value)}
            placeholder={DEFAULT_TESTIMONIALS_BANNER.ctaText}
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Enlace del botón</Label>
          <Input
            value={value.ctaHref}
            onChange={(e) => set("ctaHref", e.target.value)}
            placeholder={DEFAULT_TESTIMONIALS_BANNER.ctaHref}
            className={inputClass}
          />
          <p className="text-xs text-carbon/30 mt-1">
            Ruta de la web (p. ej. /testimonios) o URL completa. Los colores salen del botón del hero.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className={labelClass}>Tamaño del texto</Label>
          <span className="text-xs text-carbon/50 tabular-nums">{value.textScale}%</span>
        </div>
        <Slider
          className="mt-3"
          min={TEXT_SCALE_MIN}
          max={TEXT_SCALE_MAX}
          step={5}
          value={[value.textScale]}
          onValueChange={([n]) => set("textScale", n)}
          aria-label="Tamaño del texto"
        />
      </div>

      <AdminTextFonts
        fields={[
          { slot: "title", label: "Título" },
          { slot: "subtitle", label: "Subtítulo" },
          { slot: "cta", label: "Botón" },
        ]}
        value={value.fonts}
        onChange={(fonts) => set("fonts", fonts)}
      />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Label className={labelClass}>Posición del texto y vista previa</Label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-gold/20 overflow-hidden">
              {(["desktop", "mobile"] as const).map((d) => {
                const Icon = d === "desktop" ? Monitor : Smartphone;
                return (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDevice(d)}
                    aria-pressed={device === d}
                    className={cn(
                      "h-8 gap-1.5 rounded-none px-3 text-xs",
                      device === d ? "bg-gold/15 text-carbon" : "text-carbon/50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {d === "desktop" ? "Escritorio" : "Móvil"}
                  </Button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={boxIsDefault}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  [box.x]: DEFAULT_TESTIMONIALS_BANNER[box.x],
                  [box.y]: DEFAULT_TESTIMONIALS_BANNER[box.y],
                  [box.width]: DEFAULT_TESTIMONIALS_BANNER[box.width],
                }))
              }
              className="border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Restablecer posición
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {(
            [
              { key: "x", label: "Horizontal", min: 0, max: 100 - currentBox.width },
              { key: "y", label: "Vertical", min: 0, max: 100 },
              { key: "width", label: "Ancho", min: TEXT_WIDTH_MIN, max: 100 },
            ] as const
          ).map(({ key, label, min, max }) => (
            <div key={key}>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>{label}</Label>
                <span className="text-xs text-carbon/50 tabular-nums">{currentBox[key]}%</span>
              </div>
              <Slider
                className="mt-3"
                min={min}
                max={max}
                step={0.5}
                value={[currentBox[key]]}
                onValueChange={([n]) => setBox({ [key]: n })}
                aria-label={`${label} del texto (${device === "desktop" ? "escritorio" : "móvil"})`}
              />
            </div>
          ))}
        </div>

        <div className="-mx-6 border-y border-carbon/10 overflow-hidden">
          <CampaignPreviewFrame device={device}>
            <TestimonialsBanner config={value} preview previewDevice={device} />
          </CampaignPreviewFrame>
        </div>
        <p className="text-xs text-carbon/35 mt-2">
          Vista fiel de {device === "mobile" ? "móvil (390px)" : "escritorio (1920px)"}. La
          posición y el ancho del texto se guardan aparte para escritorio y para móvil; el color
          de fondo de la sección está en Contenido → Tema.
        </p>
      </div>

      <MediaCropDialog
        open={Boolean(crop)}
        src={crop?.src ?? null}
        kind="image"
        onOpenChange={closeCrop}
        aspect={ASPECT[crop?.variant ?? "desktop"]}
        maxOutputSize={crop?.variant === "mobile" ? 1080 : 1920}
        title={crop?.variant === "mobile" ? "Recortar · Testimonios móvil" : "Recortar · Testimonios escritorio"}
        onCropped={async ({ file }) => {
          if (file && crop) await upload(file, crop.variant);
        }}
      />
    </>
  );
};

export default AdminTestimonialsBannerFields;
