import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { invalidateSiteContent } from "@/hooks/use-site-content";

export interface SiteBlockFieldsProps<T> {
  value: T;
  onChange: (next: T) => void;
}

/** Un bloque de `site_content` con su formulario, para una pestaña de Contenido. */
export interface SiteBlockDefinition<T> {
  key: string;
  /** `site_content.title` de la fila. */
  rowTitle: string;
  /** Encabezado de la tarjeta en el panel. */
  label: string;
  description: string;
  defaults: T;
  parse: (raw?: string | null) => T;
  serialize: (config: T) => string;
  Fields: ComponentType<SiteBlockFieldsProps<T>>;
}

type Row = { id: string; content: string | null };

/**
 * Carga, edita y guarda un bloque. La fila solo se crea al guardar: abrir el
 * panel no escribe nada en la base de datos.
 */
function AdminSiteBlockEditor<T>({ definition }: { definition: SiteBlockDefinition<T> }) {
  const { key, rowTitle, label, description, defaults, parse, serialize, Fields } = definition;
  const { toast } = useToast();
  const [row, setRow] = useState<Row | null>(null);
  const [draft, setDraft] = useState<T>(() => parse(null));
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(parse(null)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("site_content")
        .select("id, content")
        .eq("key", key)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: "No se pudo cargar", description: error.message, variant: "destructive" });
      }
      const parsed = parse(data?.content);
      setRow(data ?? null);
      setDraft(parsed);
      setSavedSnapshot(serialize(parsed));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, parse, serialize, toast]);

  // Pasar por el parser aplica los mismos valores por defecto que la web.
  const serializedDraft = useMemo(() => serialize(parse(serialize(draft))), [draft, parse, serialize]);
  const isDirty = !row || serializedDraft !== savedSnapshot;
  const isDefault = serializedDraft === serialize(defaults);

  const save = async () => {
    setSaving(true);
    const payload = { title: rowTitle, content: serializedDraft, updated_at: new Date().toISOString() };
    try {
      if (row?.id) {
        const { error } = await (supabase as any).from("site_content").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("site_content")
          .insert({ key, ...payload })
          .select("id, content")
          .single();
        if (error) throw error;
        setRow(data);
      }
      setSavedSnapshot(serializedDraft);
      setDraft(parse(serializedDraft));
      invalidateSiteContent();
      toast({ title: "Guardado", description: `"${label}" actualizado.` });
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gold/20">
      <h3 className="font-playfair text-base font-semibold text-carbon mb-4">{label}</h3>
      <p className="text-xs text-carbon/40 -mt-2 mb-4">{description}</p>

      <div className="space-y-5">
        <Fields value={draft} onChange={setDraft} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={save}
          disabled={!isDirty || saving}
          size="sm"
          className="bg-gold hover:bg-gold/90 text-white disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Guardar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDefault}
          onClick={() => setDraft(parse(serialize(defaults)))}
          className="border-gold/20 text-carbon/60 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar valores
        </Button>
      </div>
    </div>
  );
}

export default AdminSiteBlockEditor;
