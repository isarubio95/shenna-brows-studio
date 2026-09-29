import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { invalidateSiteContent } from "@/hooks/use-site-content";
import { Loader2, Save, RotateCcw } from "lucide-react";
import {
  ThemeConfig,
  DEFAULT_THEME,
  applyTheme,
  mergeThemeConfig,
  type ThemeColorKey,
  type ThemeFontKey,
} from "@/hooks/use-theme-config";
import { HexColorField } from "@/components/admin/HexColorField";
import { FontSelect } from "@/components/admin/FontSelect";
import { getFontOption } from "@/lib/fonts";

interface ColorField {
  key: ThemeColorKey;
  label: string;
}

const FONT_FIELDS: { key: ThemeFontKey; label: string; hint: string; sample: string }[] = [
  {
    key: "fontHeadings",
    label: "Títulos",
    hint: "Titulares, nombres de producto y cabeceras de sección.",
    sample: "La precisión que te define",
  },
  {
    key: "fontBody",
    label: "Texto general",
    hint: "Párrafos, menú, botones, precios y formularios.",
    sample: "Acero inoxidable italiano, pensado para durar años.",
  },
];

const SECTION_COLORS: ColorField[] = [
  { key: "sectionProductsBg", label: "Productos (Inicio)" },
  { key: "sectionVideoBg", label: "Vídeo (Inicio)" },
  { key: "sectionBrandStoryBg", label: "Historia de marca (Inicio)" },
  { key: "sectionCeoBg", label: "CEO / Fundadora (Inicio)" },
  { key: "sectionTestimonialsBg", label: "Testimonios (Inicio)" },
  { key: "sectionAboutBg", label: "Sobre mí" },
];

const FOOTER_COLORS: ColorField[] = [
  { key: "footerBg", label: "Fondo del footer" },
  { key: "footerText", label: "Texto del footer" },
];

const TYPOGRAPHY_COLORS: ColorField[] = [
  { key: "colorH2", label: "Títulos H2" },
  { key: "colorH3", label: "Títulos H3" },
  { key: "colorH4", label: "Títulos H4" },
  { key: "colorH5", label: "Títulos H5" },
  { key: "colorH6", label: "Títulos H6" },
  { key: "colorParagraph", label: "Párrafos" },
  { key: "colorAccent", label: "Color de acento (dorado)" },
];

const AdminThemeEditor = () => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any)
      .from("site_content")
      .select("id, content")
      .eq("key", "theme_config")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setRowId(data.id);
          try {
            const merged = mergeThemeConfig(JSON.parse(data.content));
            setTheme(merged);
            setSavedTheme(merged);
          } catch {
            /* keep defaults */
          }
        }
        setLoading(false);
      });
  }, []);

  const updateColor = (key: keyof ThemeConfig, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const isDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);
  const isDefault = JSON.stringify(theme) === JSON.stringify(DEFAULT_THEME);

  const save = async () => {
    if (!isDirty) return;
    setSaving(true);
    const json = JSON.stringify(theme);

    let error: any;
    if (rowId) {
      ({ error } = await (supabase as any)
        .from("site_content")
        .update({ content: json, updated_at: new Date().toISOString() })
        .eq("id", rowId));
    } else {
      const res = await (supabase as any)
        .from("site_content")
        .insert({ key: "theme_config", title: "Theme Config", content: json })
        .select("id")
        .single();
      error = res.error;
      if (!error) setRowId(res.data.id);
    }

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar el tema.", variant: "destructive" });
    } else {
      applyTheme(theme);
      setSavedTheme(theme);
      invalidateSiteContent();
      toast({ title: "Tema guardado", description: "Los cambios se han aplicado." });
    }
    setSaving(false);
  };

  const resetDefaults = () => {
    setTheme(DEFAULT_THEME);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  const renderGroup = (title: string, fields: ColorField[]) => (
    <div className="space-y-3">
      <h4 className="font-playfair text-sm font-semibold text-foreground uppercase tracking-wider">
        {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label className="text-foreground text-sm">{f.label}</Label>
            <HexColorField
              value={theme[f.key]}
              onChange={(v) => updateColor(f.key, v)}
              fallback={DEFAULT_THEME[f.key]}
              aria-label={f.label}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderFonts = () => (
    <div className="space-y-3">
      <h4 className="font-playfair text-sm font-semibold text-foreground uppercase tracking-wider">
        Tipografías
      </h4>
      <p className="text-xs text-muted-foreground">
        Fuentes de toda la web. Cada texto del apartado Contenido puede usar además una fuente
        propia; si no, hereda estas.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FONT_FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label className="text-foreground text-sm">{f.label}</Label>
            <FontSelect
              value={theme[f.key]}
              onChange={(v) => updateColor(f.key, v || DEFAULT_THEME[f.key])}
              inheritLabel={`Por defecto (${getFontOption(DEFAULT_THEME[f.key])?.label})`}
              aria-label={`Tipografía: ${f.label}`}
            />
            <p className="text-xs text-muted-foreground">{f.hint}</p>
            <p
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-lg text-foreground truncate"
              style={{ fontFamily: getFontOption(theme[f.key])?.stack }}
            >
              {f.sample}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 space-y-8">
      {renderFonts()}
      {renderGroup("Fondos de sección", SECTION_COLORS)}
      {renderGroup("Footer", FOOTER_COLORS)}
      {renderGroup("Tipografía y acento", TYPOGRAPHY_COLORS)}

      <div className="flex gap-3 pt-2">
        <Button
          onClick={save}
          disabled={!isDirty || saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40"
          size="sm"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Guardar tema
        </Button>
        <Button
          onClick={resetDefaults}
          variant="outline"
          size="sm"
          disabled={isDefault}
          className="border-border text-muted-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar valores
        </Button>
      </div>
    </div>
  );
};

export default AdminThemeEditor;
