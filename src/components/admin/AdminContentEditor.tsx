import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";

interface ContentBlock {
  id: string;
  key: string;
  title: string;
  content: string;
}

const CONTENT_LABELS: Record<string, string> = {
  index_brand_story: "Texto principal — Página de inicio",
  about_section_1: "Sobre mí — Sección 1",
  about_section_2: "Sobre mí — Sección 2",
  about_section_3: "Sobre mí — Sección 3",
  about_section_4: "Sobre mí — Sección 4",
};

const AdminContentEditor = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any)
      .from("site_content")
      .select("*")
      .order("key")
      .then(({ data, error }: any) => {
        if (!error && data) setBlocks(data);
        setLoading(false);
      });
  }, []);

  const updateField = (key: string, field: "title" | "content", value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.key === key ? { ...b, [field]: value } : b))
    );
  };

  const saveBlock = async (block: ContentBlock) => {
    setSaving(block.key);
    const { error } = await (supabase as any)
      .from("site_content")
      .update({ title: block.title, content: block.content, updated_at: new Date().toISOString() })
      .eq("id", block.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: `"${CONTENT_LABELS[block.key] || block.key}" actualizado.` });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" />
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="p-8 text-center text-carbon/40">
        No hay contenido editable configurado. Ejecuta la migración de base de datos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div
          key={block.key}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6"
        >
          <h3 className="font-playfair text-base font-semibold text-carbon mb-4">
            {CONTENT_LABELS[block.key] || block.key}
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="text-carbon/60 text-xs uppercase tracking-wider">Título</Label>
              <Input
                value={block.title}
                onChange={(e) => updateField(block.key, "title", e.target.value)}
                className="mt-1 border-gold/20 focus-visible:ring-gold/30"
              />
            </div>

            <div>
              <Label className="text-carbon/60 text-xs uppercase tracking-wider">Contenido</Label>
              <Textarea
                value={block.content}
                onChange={(e) => updateField(block.key, "content", e.target.value)}
                rows={block.key === "index_brand_story" ? 12 : 4}
                className="mt-1 border-gold/20 focus-visible:ring-gold/30"
              />
              <p className="text-xs text-carbon/30 mt-1">Separa los párrafos con líneas en blanco.</p>
            </div>

            <Button
              onClick={() => saveBlock(block)}
              disabled={saving === block.key}
              className="bg-gold hover:bg-gold/90 text-white"
              size="sm"
            >
              {saving === block.key ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminContentEditor;
