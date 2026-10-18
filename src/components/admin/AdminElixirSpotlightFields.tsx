import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ElixirSpotlightView } from "@/components/ElixirSpotlight";
import type { CatalogProduct } from "@/components/ProductCard";
import AdminBlockPreview from "@/components/admin/AdminBlockPreview";
import type { SiteBlockFieldsProps } from "@/components/admin/AdminSiteBlockEditor";
import {
  DEFAULT_ELIXIR_SPOTLIGHT,
  ELIXIR_SPOTLIGHT_MAX_BENEFITS,
  ELIXIR_SPOTLIGHT_NO_VIDEO,
  pickDemoVideo,
  type ElixirSpotlightConfig,
} from "@/lib/elixir-spotlight-content";
import { parseProductFeatureVideos } from "@/lib/product-feature-videos";

const labelClass = "text-carbon/60 text-xs uppercase tracking-wider";
const inputClass = "mt-1 border-gold/20 focus-visible:ring-gold/30";

/** Radix Select no admite "" como valor. */
const AUTO_VIDEO = "__auto__";

const AdminElixirSpotlightFields = ({ value, onChange }: SiteBlockFieldsProps<ElixirSpotlightConfig>) => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const set = <K extends keyof ElixirSpotlightConfig>(key: K, next: ElixirSpotlightConfig[K]) =>
    onChange({ ...value, [key]: next });

  useEffect(() => {
    let cancelled = false;
    (supabase as any)
      .from("products")
      .select("*")
      .order("name")
      .then(({ data }: { data: CatalogProduct[] | null }) => {
        if (!cancelled) setProducts(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const product = products.find((p) => p.slug === value.productSlug) ?? null;
  const videos = useMemo(() => parseProductFeatureVideos(product?.feature_videos), [product?.feature_videos]);
  const autoVideo = pickDemoVideo(videos, "");
  const benefitSlots = Array.from(
    { length: ELIXIR_SPOTLIGHT_MAX_BENEFITS },
    (_, i) => value.benefits[i] ?? "",
  );

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Switch
          id="spotlight-enabled"
          checked={value.enabled}
          onCheckedChange={(enabled) => set("enabled", enabled)}
        />
        <Label htmlFor="spotlight-enabled" className="text-sm text-carbon/70 cursor-pointer">
          Mostrar en la web
        </Label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className={labelClass}>Producto protagonista</Label>
          <Select value={value.productSlug} onValueChange={(slug) => onChange({ ...value, productSlug: slug, demoVideoId: "" })}>
            <SelectTrigger aria-label="Producto protagonista" className="mt-1 border-gold/20 focus:ring-gold/30">
              <SelectValue placeholder="Elige un producto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.slug}>
                  {p.category} · {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-carbon/30 mt-1">
            También sale el primero en la tienda, la colección del inicio y «Completa tu carrito».
          </p>
        </div>
        <div>
          <Label className={labelClass}>Vídeo de demostración</Label>
          <Select
            value={value.demoVideoId || AUTO_VIDEO}
            onValueChange={(id) => set("demoVideoId", id === AUTO_VIDEO ? "" : id)}
          >
            <SelectTrigger aria-label="Vídeo de demostración" className="mt-1 border-gold/20 focus:ring-gold/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_VIDEO}>
                Automático{autoVideo ? ` (${autoVideo.title || "primer vídeo"})` : " (foto)"}
              </SelectItem>
              {videos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                  {video.title || "Vídeo sin título"}
                </SelectItem>
              ))}
              <SelectItem value={ELIXIR_SPOTLIGHT_NO_VIDEO}>Foto del producto</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-carbon/30 mt-1">Son los vídeos de la ficha del producto (Catálogo).</p>
        </div>
        <div>
          <Label className={labelClass}>Antetítulo</Label>
          <Input
            value={value.eyebrow}
            onChange={(e) => set("eyebrow", e.target.value)}
            placeholder="Opcional"
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Título</Label>
          <Input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={product?.category ? `${product.category} (nombre del producto)` : "Nombre del producto"}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <Label className={labelClass}>Texto</Label>
        <Textarea
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className={`${inputClass} font-sans`}
        />
      </div>

      <fieldset className="rounded-lg border border-gold/15 p-4 space-y-2">
        <legend className="px-1 text-xs font-medium text-carbon/50">
          Beneficios (hasta {ELIXIR_SPOTLIGHT_MAX_BENEFITS})
        </legend>
        {benefitSlots.map((benefit, index) => (
          <Input
            key={index}
            value={benefit}
            aria-label={`Beneficio ${index + 1}`}
            onChange={(e) =>
              set(
                "benefits",
                benefitSlots.map((b, i) => (i === index ? e.target.value : b)),
              )
            }
            placeholder={DEFAULT_ELIXIR_SPOTLIGHT.benefits[index] ?? "Opcional"}
            className="border-gold/20 focus-visible:ring-gold/30"
          />
        ))}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className={labelClass}>Botón de compra</Label>
          <Input
            value={value.ctaText}
            onChange={(e) => set("ctaText", e.target.value)}
            placeholder={DEFAULT_ELIXIR_SPOTLIGHT.ctaText}
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Enlace a la ficha</Label>
          <Input
            value={value.secondaryCtaText}
            onChange={(e) => set("secondaryCtaText", e.target.value)}
            placeholder="Vacío = sin enlace"
            className={inputClass}
          />
        </div>
      </div>

      {product ? (
        <AdminBlockPreview note="El vídeo arranca solo, sin sonido, cuando se ve en pantalla.">
          {() => <ElixirSpotlightView config={value} product={product} preview />}
        </AdminBlockPreview>
      ) : null}
    </>
  );
};

export default AdminElixirSpotlightFields;
