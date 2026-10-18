import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TrustStripView } from "@/components/TrustStrip";
import AdminBlockPreview from "@/components/admin/AdminBlockPreview";
import AdminMarketingIconSelect from "@/components/admin/AdminMarketingIconSelect";
import ProvisionalNote from "@/components/admin/ProvisionalNote";
import type { SiteBlockFieldsProps } from "@/components/admin/AdminSiteBlockEditor";
import { isProvisionalText } from "@/lib/provisional-content";
import {
  DEFAULT_TRUST_STRIP,
  TRUST_STRIP_MAX_ITEMS,
  TRUST_STRIP_PROVISIONAL_DELIVERY,
  type TrustStripConfig,
  type TrustStripItem,
} from "@/lib/trust-strip-content";

const labelClass = "text-carbon/60 text-xs uppercase tracking-wider";
const inputClass = "mt-1 border-gold/20 focus-visible:ring-gold/30";

const AdminTrustStripFields = ({ value, onChange }: SiteBlockFieldsProps<TrustStripConfig>) => {
  // Siempre los cuatro huecos: una ventaja vaciada se puede volver a rellenar.
  const slots = Array.from(
    { length: TRUST_STRIP_MAX_ITEMS },
    (_, i): TrustStripItem =>
      value.items[i] ?? {
        icon: DEFAULT_TRUST_STRIP.items[i]?.icon ?? "sparkle",
        title: "",
        subtitle: "",
        compactTitle: "",
        compactSubtitle: "",
      },
  );
  const setItem = (index: number, patch: Partial<TrustStripItem>) =>
    onChange({
      ...value,
      items: slots.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Switch
          id="trust-strip-enabled"
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
        <Label htmlFor="trust-strip-enabled" className="text-sm text-carbon/70 cursor-pointer">
          Mostrar en la web
        </Label>
      </div>

      <div>
        <Label className={labelClass}>Título en la ficha de producto</Label>
        <Input
          value={value.compactHeading}
          onChange={(e) => onChange({ ...value, compactHeading: e.target.value })}
          placeholder={DEFAULT_TRUST_STRIP.compactHeading}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {slots.map((item, index) => {
          const provisional =
            isProvisionalText(item.title, TRUST_STRIP_PROVISIONAL_DELIVERY.title) ||
            isProvisionalText(item.subtitle, TRUST_STRIP_PROVISIONAL_DELIVERY.subtitle);
          return (
            <fieldset key={index} className="rounded-lg border border-gold/15 p-4 space-y-3">
              <legend className="px-1 text-xs font-medium text-carbon/50">Ventaja {index + 1}</legend>
              {provisional ? (
                <ProvisionalNote>
                  Plazo pendiente de confirmar: en el vídeo se habla de «envío en máximo 24 horas,
                  entrega de 2 a 3 días».
                </ProvisionalNote>
              ) : null}
              <div>
                <Label className={labelClass}>Icono</Label>
                <AdminMarketingIconSelect
                  value={item.icon}
                  onChange={(icon) => setItem(index, { icon })}
                  ariaLabel={`Icono de la ventaja ${index + 1}`}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className={labelClass}>Título</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => setItem(index, { title: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Subtítulo</Label>
                  <Input
                    value={item.subtitle}
                    onChange={(e) => setItem(index, { subtitle: e.target.value })}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Título en la ficha</Label>
                  <Input
                    value={item.compactTitle}
                    onChange={(e) => setItem(index, { compactTitle: e.target.value })}
                    placeholder={item.title || "Igual que el título"}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Subtítulo en la ficha</Label>
                  <Input
                    value={item.compactSubtitle}
                    onChange={(e) => setItem(index, { compactSubtitle: e.target.value })}
                    placeholder="Opcional, muy corto"
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>
      <p className="text-xs text-carbon/35 -mt-2">
        Los iconos y títulos usan el color de acento del tema (Contenido → Tema). Una ventaja sin
        título no se muestra.
      </p>

      <AdminBlockPreview note="Debajo, la versión de la ficha de producto.">
        {() => (
          <>
            <TrustStripView config={value} preview />
            <div className="mx-auto max-w-md px-6 pb-6">
              <TrustStripView config={value} variant="compact" preview />
            </div>
          </>
        )}
      </AdminBlockPreview>
    </>
  );
};

export default AdminTrustStripFields;
