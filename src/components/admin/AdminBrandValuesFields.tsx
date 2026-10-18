import { useRef, useState } from "react";
import { ImageOff, Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BrandValuesView } from "@/components/BrandValues";
import AdminBlockPreview from "@/components/admin/AdminBlockPreview";
import AdminMarketingIconSelect from "@/components/admin/AdminMarketingIconSelect";
import ProvisionalNote from "@/components/admin/ProvisionalNote";
import type { SiteBlockFieldsProps } from "@/components/admin/AdminSiteBlockEditor";
import {
  BRAND_VALUES_MAX_CARDS,
  BRAND_VALUES_PLACEHOLDER_IMAGES,
  DEFAULT_BRAND_VALUES,
  type BrandValueCard,
  type BrandValuesConfig,
} from "@/lib/brand-values-content";
import { CAMPAIGN_BUCKET, uploadMedia, uploadResultDescription } from "@/lib/upload-media";

const labelClass = "text-carbon/60 text-xs uppercase tracking-wider";
const inputClass = "mt-1 border-gold/20 focus-visible:ring-gold/30";

const AdminBrandValuesFields = ({ value, onChange }: SiteBlockFieldsProps<BrandValuesConfig>) => {
  const { toast } = useToast();
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);
  const [uploading, setUploading] = useState<number | null>(null);

  // Siempre los cuatro huecos: una tarjeta vaciada se puede volver a rellenar.
  const slots = Array.from(
    { length: BRAND_VALUES_MAX_CARDS },
    (_, i): BrandValueCard =>
      value.cards[i] ?? {
        icon: DEFAULT_BRAND_VALUES.cards[i]?.icon ?? "sparkle",
        title: "",
        text: "",
        imageUrl: "",
        imageAlt: "",
      },
  );
  const setCard = (index: number, patch: Partial<BrandValueCard>) =>
    onChange({ ...value, cards: slots.map((card, i) => (i === index ? { ...card, ...patch } : card)) });

  const upload = async (index: number, file: File) => {
    setUploading(index);
    try {
      const result = await uploadMedia(file, {
        bucket: CAMPAIGN_BUCKET,
        pathPrefix: `valores-${index + 1}`,
        variant: "mobile",
      });
      setCard(index, { imageUrl: result.url });
      toast({
        title: "Foto subida",
        description: `${uploadResultDescription(result, "web")} Guarda para publicarla.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Error al subir",
        description: err instanceof Error ? err.message : "No se pudo subir la foto.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Switch
          id="brand-values-enabled"
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
        <Label htmlFor="brand-values-enabled" className="text-sm text-carbon/70 cursor-pointer">
          Mostrar en la web
        </Label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className={labelClass}>Antetítulo</Label>
          <Input
            value={value.eyebrow}
            onChange={(e) => onChange({ ...value, eyebrow: e.target.value })}
            placeholder="Opcional"
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Palabras clave</Label>
          <Input
            value={value.keywords}
            onChange={(e) => onChange({ ...value, keywords: e.target.value })}
            placeholder="Opcional · separadas por puntos"
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Título</Label>
          <Input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder={DEFAULT_BRAND_VALUES.title}
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Parte resaltada del título</Label>
          <Input
            value={value.titleAccent}
            onChange={(e) => onChange({ ...value, titleAccent: e.target.value })}
            placeholder="Opcional"
            className={inputClass}
          />
          <p className="text-xs text-carbon/30 mt-1">Tiene que aparecer tal cual en el título.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {slots.map((card, index) => {
          const placeholderPhoto = BRAND_VALUES_PLACEHOLDER_IMAGES.includes(card.imageUrl);
          const defaultPhoto = DEFAULT_BRAND_VALUES.cards[index]?.imageUrl ?? "";
          return (
            <fieldset key={index} className="rounded-lg border border-gold/15 p-4 space-y-3">
              <legend className="px-1 text-xs font-medium text-carbon/50">Valor {index + 1}</legend>

              <div className="flex gap-3">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md border border-gold/15 bg-[#EFE4D8]">
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-carbon/30">
                      <ImageOff className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2">
                  <input
                    ref={(el) => {
                      fileInputs.current[index] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void upload(index, file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading !== null}
                    onClick={() => fileInputs.current[index]?.click()}
                    className="border-gold/20 text-carbon/70"
                  >
                    {uploading === index ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Subir foto
                  </Button>
                  <div className="flex gap-3 text-xs">
                    {card.imageUrl !== defaultPhoto && defaultPhoto ? (
                      <button
                        type="button"
                        onClick={() => setCard(index, { imageUrl: defaultPhoto })}
                        className="inline-flex items-center gap-1 text-carbon/45 hover:text-carbon"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden />
                        Foto de serie
                      </button>
                    ) : null}
                    {card.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setCard(index, { imageUrl: "" })}
                        className="text-carbon/45 hover:text-carbon"
                      >
                        Quitar foto
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              {placeholderPhoto ? (
                <ProvisionalNote>
                  Foto provisional recortada de la maqueta (baja resolución): sube la definitiva.
                </ProvisionalNote>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className={labelClass}>Icono</Label>
                  <AdminMarketingIconSelect
                    value={card.icon}
                    onChange={(icon) => setCard(index, { icon })}
                    ariaLabel={`Icono del valor ${index + 1}`}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Título</Label>
                  <Input
                    value={card.title}
                    onChange={(e) => setCard(index, { title: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <Label className={labelClass}>Texto</Label>
                <Textarea
                  value={card.text}
                  onChange={(e) => setCard(index, { text: e.target.value })}
                  rows={2}
                  className={`${inputClass} font-sans`}
                />
              </div>
              <div>
                <Label className={labelClass}>Descripción de la foto</Label>
                <Input
                  value={card.imageAlt}
                  onChange={(e) => setCard(index, { imageAlt: e.target.value })}
                  placeholder="Para lectores de pantalla (opcional)"
                  className={inputClass}
                />
              </div>
            </fieldset>
          );
        })}
      </div>
      <p className="text-xs text-carbon/35 -mt-2">
        Un valor sin título no se muestra. Las fotos se ven más anchas en escritorio y casi cuadradas
        en móvil: mejor con el motivo centrado.
      </p>

      <AdminBlockPreview>{() => <BrandValuesView config={value} preview />}</AdminBlockPreview>
    </>
  );
};

export default AdminBrandValuesFields;
