import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Monitor, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminColorField } from "@/components/admin/HexColorField";
import { AdminTextFonts } from "@/components/admin/FontSelect";
import PromoCodeBanner from "@/components/PromoCodeBanner";
import {
  CampaignPreviewFrame,
  type CampaignPreviewDevice,
} from "@/components/CampaignBanner";
import {
  DEFAULT_PROMO_CODE_BANNER,
  normalizePromoCode,
  type PromoCodeBannerConfig,
} from "@/lib/promo-code-banner-content";
import { cn } from "@/lib/utils";

type DiscountCode = Pick<
  Tables<"discount_codes">,
  | "id"
  | "code"
  | "description"
  | "discount_type"
  | "discount_value"
  | "min_subtotal"
  | "first_order_only"
  | "is_active"
  | "starts_at"
  | "ends_at"
>;

type CodeStatus = "active" | "inactive" | "expired" | "scheduled";

const STATUS_LABEL: Record<CodeStatus, string> = {
  active: "Activo",
  inactive: "Desactivado",
  expired: "Caducado",
  scheduled: "Aún no ha empezado",
};

/** Radix Select no admite "" como valor. */
const NO_CODE = "__none__";

const labelClass = "text-carbon/60 text-xs uppercase tracking-wider";
const inputClass = "mt-1 border-gold/20 focus-visible:ring-gold/30";

const formatMoney = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

function codeStatus(row: DiscountCode, now = Date.now()): CodeStatus {
  if (!row.is_active) return "inactive";
  if (row.ends_at && new Date(row.ends_at).getTime() < now) return "expired";
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return "scheduled";
  return "active";
}

function codeSummary(row: DiscountCode): string {
  const value =
    row.discount_type === "percent"
      ? `${Number(row.discount_value)}%`
      : formatMoney(Number(row.discount_value));
  return [
    `${value} de descuento`,
    row.min_subtotal ? `pedido mínimo ${formatMoney(Number(row.min_subtotal))}` : null,
    row.first_order_only ? "solo primer pedido" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface Props {
  value: PromoCodeBannerConfig;
  onChange: (update: (prev: PromoCodeBannerConfig) => PromoCodeBannerConfig) => void;
}

/** Campos del bloque «Código promocional» de la home en Admin → Contenido. */
const AdminPromoCodeBannerFields = ({ value, onChange }: Props) => {
  const [device, setDevice] = useState<CampaignPreviewDevice>("desktop");
  const [codes, setCodes] = useState<DiscountCode[] | null>(null);
  const [codesError, setCodesError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("discount_codes")
      .select(
        "id, code, description, discount_type, discount_value, min_subtotal, first_order_only, is_active, starts_at, ends_at",
      )
      .order("code")
      .then(({ data, error }) => {
        if (cancelled) return;
        setCodesError(Boolean(error));
        setCodes((data as DiscountCode[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof PromoCodeBannerConfig>(key: K, next: PromoCodeBannerConfig[K]) =>
    onChange((prev) => ({ ...prev, [key]: next }));

  const selectedCode = normalizePromoCode(value.code);
  const selectedRow = codes?.find((row) => normalizePromoCode(row.code) === selectedCode);
  const selectedStatus = selectedRow ? codeStatus(selectedRow) : null;

  let codeWarning: string | null = null;
  if (!selectedCode) {
    codeWarning = "Sin código asociado, la sección no se muestra en la web.";
  } else if (codes && !codesError && !selectedRow) {
    codeWarning = `«${selectedCode}» no existe en Códigos dto.: quien lo copie no podrá usarlo.`;
  } else if (selectedStatus && selectedStatus !== "active") {
    codeWarning = `Este código está ${STATUS_LABEL[selectedStatus].toLowerCase()}: quien lo copie no podrá usarlo todavía.`;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gold/15 bg-cream/40 px-4 py-3">
        <div>
          <Label htmlFor="promo-code-enabled" className="text-sm text-carbon">
            Mostrar en la página de inicio
          </Label>
          <p className="text-xs text-carbon/40">Si la apagas, la sección desaparece de la home.</p>
        </div>
        <Switch
          id="promo-code-enabled"
          checked={value.enabled}
          onCheckedChange={(checked) => set("enabled", checked)}
        />
      </div>

      <div>
        <Label className={labelClass}>Código de descuento asociado</Label>
        {codes === null ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-carbon/50">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando códigos…
          </div>
        ) : (
          <Select
            value={selectedCode || NO_CODE}
            onValueChange={(next) => set("code", next === NO_CODE ? "" : next)}
          >
            <SelectTrigger className={inputClass} aria-label="Código de descuento asociado">
              <SelectValue placeholder="Elige un código" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CODE}>Sin código (ocultar sección)</SelectItem>
              {codes.map((row) => {
                const status = codeStatus(row);
                return (
                  <SelectItem key={row.id} value={normalizePromoCode(row.code)}>
                    <span className="font-mono">{normalizePromoCode(row.code)}</span>
                    <span className="text-carbon/45"> · {codeSummary(row)}</span>
                    {status !== "active" ? (
                      <span className="text-destructive"> · {STATUS_LABEL[status]}</span>
                    ) : null}
                  </SelectItem>
                );
              })}
              {/* Un código guardado que ya no está en la tabla sigue apareciendo elegido. */}
              {selectedCode && !selectedRow ? (
                <SelectItem value={selectedCode}>
                  <span className="font-mono">{selectedCode}</span>
                  <span className="text-destructive"> · No encontrado</span>
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        )}
        {selectedRow ? (
          <p className="mt-1 text-xs text-carbon/45">
            {codeSummary(selectedRow)}
            {selectedRow.description ? ` — ${selectedRow.description}` : ""}
          </p>
        ) : null}
        {codesError ? (
          <p className="mt-1 text-xs text-destructive">No se pudo cargar la lista de códigos.</p>
        ) : null}
        {codeWarning ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {codeWarning}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-carbon/30">
          Los códigos se crean y se editan en Códigos dto. Revisa que el subtítulo describa el
          mismo descuento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className={labelClass}>Título</Label>
          <Input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={DEFAULT_PROMO_CODE_BANNER.title}
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Subtítulo</Label>
          <Input
            value={value.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="Opcional"
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Texto del botón</Label>
          <Input
            value={value.copyText}
            onChange={(e) => set("copyText", e.target.value)}
            placeholder={DEFAULT_PROMO_CODE_BANNER.copyText}
            className={inputClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Texto al copiar</Label>
          <Input
            value={value.copiedText}
            onChange={(e) => set("copiedText", e.target.value)}
            placeholder={DEFAULT_PROMO_CODE_BANNER.copiedText}
            className={inputClass}
          />
          <p className="text-xs text-carbon/30 mt-1">Aparece en el botón unos segundos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AdminColorField
          label="Fondo (arriba)"
          value={value.backgroundColor}
          fallback={DEFAULT_PROMO_CODE_BANNER.backgroundColor}
          onChange={(hex) => set("backgroundColor", hex)}
          ariaLabel="Color de fondo, parte superior"
        />
        <AdminColorField
          label="Fondo (abajo)"
          value={value.backgroundColorEnd}
          fallback={DEFAULT_PROMO_CODE_BANNER.backgroundColorEnd}
          onChange={(hex) => set("backgroundColorEnd", hex)}
          ariaLabel="Color de fondo, parte inferior"
        />
        <AdminColorField
          label="Color del título"
          value={value.titleColor}
          fallback={DEFAULT_PROMO_CODE_BANNER.titleColor}
          onChange={(hex) => set("titleColor", hex)}
          ariaLabel="Color del título"
        />
        <AdminColorField
          label="Color del subtítulo"
          value={value.subtitleColor}
          fallback={DEFAULT_PROMO_CODE_BANNER.subtitleColor}
          onChange={(hex) => set("subtitleColor", hex)}
          ariaLabel="Color del subtítulo"
        />
        <AdminColorField
          label="Color del código y su borde"
          value={value.codeColor}
          fallback={DEFAULT_PROMO_CODE_BANNER.codeColor}
          onChange={(hex) => set("codeColor", hex)}
          ariaLabel="Color del código y del borde discontinuo"
        />
        <AdminColorField
          label="Fondo del botón"
          value={value.buttonBg}
          fallback={DEFAULT_PROMO_CODE_BANNER.buttonBg}
          onChange={(hex) => set("buttonBg", hex)}
          ariaLabel="Color de fondo del botón"
        />
        <AdminColorField
          label="Texto del botón"
          value={value.buttonTextColor}
          fallback={DEFAULT_PROMO_CODE_BANNER.buttonTextColor}
          onChange={(hex) => set("buttonTextColor", hex)}
          ariaLabel="Color del texto del botón"
        />
      </div>
      <p className="text-xs text-carbon/30 -mt-2">
        Pon el mismo color arriba y abajo para un fondo liso.
      </p>

      <AdminTextFonts
        fields={[
          { slot: "title", label: "Título" },
          { slot: "subtitle", label: "Subtítulo" },
          { slot: "code", label: "Código" },
          { slot: "button", label: "Botón" },
        ]}
        value={value.fonts}
        onChange={(fonts) => set("fonts", fonts)}
      />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Label className={labelClass}>Vista previa</Label>
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
        </div>
        <div className="-mx-6 border-y border-carbon/10 overflow-hidden">
          <CampaignPreviewFrame device={device}>
            <PromoCodeBanner config={value} preview />
          </CampaignPreviewFrame>
        </div>
        <p className="text-xs text-carbon/35 mt-2">
          Vista fiel de {device === "mobile" ? "móvil (390px)" : "escritorio (1920px)"}. El botón
          copia de verdad el código.
          {!selectedCode ? " «TUCODIGO» es solo un ejemplo mientras no elijas uno." : ""}
        </p>
      </div>
    </>
  );
};

export default AdminPromoCodeBannerFields;
