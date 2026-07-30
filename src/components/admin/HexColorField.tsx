import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** #RGB, #RRGGBB o #RRGGBBAA */
const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/** Normaliza a #RRGGBBAA para el picker con alpha. */
export function toPickerColor(value: string, fallback = "#F8F3EBFF"): string {
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return fallback.length === 9 ? fallback : `${fallback}FF`.slice(0, 9);

  const raw = trimmed.slice(1).toUpperCase();
  if (raw.length === 3) {
    const [r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}FF`;
  }
  if (raw.length === 6) return `#${raw}FF`;
  return `#${raw}`;
}

export function normalizeHex(hex: string): string {
  const raw = hex.trim().replace(/^#/, "").toUpperCase();
  if (raw.length === 3) {
    const [r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (raw.length === 8 && raw.endsWith("FF")) {
    // Opacidad total: guardar como #RRGGBB (más limpio)
    return `#${raw.slice(0, 6)}`;
  }
  return `#${raw}`;
}

interface HexColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
  fallback?: string;
  className?: string;
  "aria-label"?: string;
}

export function HexColorField({
  value,
  onChange,
  fallback = "#F8F3EB",
  className,
  "aria-label": ariaLabel = "Seleccionar color",
}: HexColorFieldProps) {
  const pickerColor = toPickerColor(value, toPickerColor(fallback));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gold/20 shadow-sm transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
            }}
          >
            <span className="absolute inset-0" style={{ backgroundColor: pickerColor }} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto border-gold/15 bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        >
          <HexAlphaColorPicker
            color={pickerColor}
            onChange={(hex) => onChange(normalizeHex(hex))}
            style={{ width: 200 }}
          />
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-carbon/40 font-mono">#</span>
            <HexColorInput
              color={pickerColor}
              onChange={(hex) => onChange(normalizeHex(hex))}
              alpha
              className="h-9 w-full rounded-md border border-gold/20 bg-transparent px-2 font-mono text-sm uppercase text-carbon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
              aria-label="Código hexadecimal con transparencia"
            />
          </div>
        </PopoverContent>
      </Popover>

      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-carbon/35 font-mono">
          #
        </span>
        <HexColorInput
          color={pickerColor}
          onChange={(hex) => onChange(normalizeHex(hex))}
          alpha
          className="h-10 w-full rounded-md border border-gold/20 bg-transparent pl-7 pr-3 font-mono text-sm uppercase text-carbon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
          aria-label={`${ariaLabel} (hex)`}
        />
      </div>
    </div>
  );
}
