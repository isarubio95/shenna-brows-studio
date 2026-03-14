import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { ThemeConfig, DEFAULT_THEME } from "@/hooks/use-theme-config";

interface ColorField {
  key: keyof ThemeConfig;
  label: string;
}

const SECTION_COLORS: ColorField[] = [
  { key: "sectionProductsBg", label: "Productos (Inicio)" },
  { key: "sectionVideoBg", label: "Vídeo presentación (Inicio)" },
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

const ColorPicker = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-border cursor-pointer appearance-none bg-transparent p-0"
        style={{ WebkitAppearance: "none" }}
      />
    </div>
    <div className="flex-1 min-w-0">
      <Label className="text-foreground text-sm">{label}</Label>
      <p className="text-muted-foreground text-xs font-mono">{value}</p>
    </div>
  </div>
);

const AdminThemeEditor = () => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
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
            setTheme({ ...DEFAULT_THEME, ...JSON.parse(data.content) });
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

  const save = async () => {
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
      // Apply live
      const root = document.documentElement;
      const CSS_VAR_MAP: Record<string, string> = {
        sectionProductsBg: "--theme-section-products-bg",
        sectionVideoBg: "--theme-section-video-bg",
        sectionBrandStoryBg: "--theme-section-brand-story-bg",
        sectionCeoBg: "--theme-section-ceo-bg",
        sectionTestimonialsBg: "--theme-section-testimonials-bg",
        sectionAboutBg: "--theme-section-about-bg",
        footerBg: "--theme-footer-bg",
        footerText: "--theme-footer-text",
        colorH2: "--theme-color-h2",
        colorH3: "--theme-color-h3",
        colorH4: "--theme-color-h4",
        colorH5: "--theme-color-h5",
        colorH6: "--theme-color-h6",
        colorParagraph: "--theme-color-paragraph",
        colorAccent: "--theme-color-accent",
      };
      for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
        root.style.setProperty(cssVar, theme[key as keyof ThemeConfig]);
      }
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
          <ColorPicker
            key={f.key}
            value={theme[f.key]}
            onChange={(v) => updateColor(f.key, v)}
            label={f.label}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 space-y-8">
      {renderGroup("Fondos de sección", SECTION_COLORS)}
      {renderGroup("Footer", FOOTER_COLORS)}
      {renderGroup("Tipografía y acento", TYPOGRAPHY_COLORS)}

      <div className="flex gap-3 pt-2">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
          className="border-border text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar valores
        </Button>
      </div>
    </div>
  );
};

export default AdminThemeEditor;
