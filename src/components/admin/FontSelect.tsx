import { useEffect } from "react";
import { Type } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FONT_CATEGORY_LABELS,
  FONT_OPTIONS,
  getFontOption,
  loadAllFonts,
  type FontCategory,
} from "@/lib/fonts";
import { cn } from "@/lib/utils";

/** Radix Select no admite `value=""`: este centinela representa "heredar". */
const INHERIT_VALUE = "__inherit__";

const CATEGORIES = Object.keys(FONT_CATEGORY_LABELS) as FontCategory[];

interface FontSelectProps {
  /** Id del catálogo, o "" para heredar. */
  value: string;
  onChange: (id: string) => void;
  /** Texto de la opción que hereda (p. ej. "Del tema"). Sin él no se puede heredar. */
  inheritLabel?: string;
  "aria-label"?: string;
  className?: string;
}

export function FontSelect({
  value,
  onChange,
  inheritLabel = "Predeterminada del tema",
  "aria-label": ariaLabel,
  className,
}: FontSelectProps) {
  // Las muestras del desplegable se pintan en su propia fuente.
  useEffect(() => {
    loadAllFonts();
  }, []);

  const current = getFontOption(value);

  return (
    <Select
      value={current ? current.id : INHERIT_VALUE}
      onValueChange={(v) => onChange(v === INHERIT_VALUE ? "" : v)}
    >
      <SelectTrigger aria-label={ariaLabel} className={cn("h-10 border-gold/20", className)}>
        <SelectValue>
          <span className="flex items-center gap-2 min-w-0">
            <Type className="h-3.5 w-3.5 shrink-0 text-carbon/40" aria-hidden />
            <span
              className={cn("truncate text-[15px]", !current && "text-carbon/50")}
              style={current ? { fontFamily: current.stack } : undefined}
            >
              {current ? current.label : inheritLabel}
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={INHERIT_VALUE} className="text-carbon/60">
          {inheritLabel}
        </SelectItem>
        {CATEGORIES.map((category) => (
          <SelectGroup key={category}>
            <SelectSeparator />
            <SelectLabel className="text-[10px] uppercase tracking-[0.2em] text-carbon/40">
              {FONT_CATEGORY_LABELS[category]}
            </SelectLabel>
            {FONT_OPTIONS.filter((f) => f.category === category).map((font) => (
              <SelectItem key={font.id} value={font.id}>
                <span className="text-[17px] leading-tight" style={{ fontFamily: font.stack }}>
                  {font.label}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Selector con su rótulo, con el mismo aspecto que los campos de color del panel. */
export function AdminFontField({
  label,
  value,
  onChange,
  inheritLabel,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  inheritLabel?: string;
}) {
  return (
    <div>
      <Label className="text-carbon/60 text-xs uppercase tracking-wider">{label}</Label>
      <div className="mt-1">
        <FontSelect
          value={value}
          onChange={onChange}
          inheritLabel={inheritLabel}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export interface TextFontField<Slot extends string> {
  slot: Slot;
  label: string;
}

/** Recuadro con un selector de fuente por cada texto de un bloque de contenido. */
export function AdminTextFonts<Fonts extends Record<string, string>>({
  fields,
  value,
  onChange,
  className,
}: {
  fields: TextFontField<keyof Fonts & string>[];
  value: Fonts;
  onChange: (next: Fonts) => void;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-gold/15 bg-cream/40 p-4 space-y-3", className)}>
      <div>
        <p className="text-sm font-medium text-carbon">Tipografías</p>
        <p className="text-xs text-carbon/40">
          Si no eliges ninguna, cada texto usa la fuente general de la web (pestaña Tema).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <AdminFontField
            key={field.slot}
            label={field.label}
            value={value[field.slot] ?? ""}
            onChange={(id) => onChange({ ...value, [field.slot]: id })}
          />
        ))}
      </div>
    </div>
  );
}
