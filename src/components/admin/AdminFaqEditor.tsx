import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  cloneFaqConfig,
  createFaqItem,
  createFaqSection,
  DEFAULT_FAQ,
  FAQ_CONTENT_KEY,
  FAQ_PAGE_PATH,
  isPendingFaqAnswer,
  moveArrayItem,
  parseFaqConfig,
  serializeFaqConfig,
  type FaqItem,
  type FaqPageConfig,
  type FaqSection,
} from "@/lib/faq-content";
import { invalidateFaqPageVisibleCache } from "@/hooks/use-faq-page-visible";
import { cn } from "@/lib/utils";

type ContentRow = {
  id: string;
  key: string;
  title: string | null;
  content: string | null;
};

type DeleteTarget =
  | { type: "section"; sectionId: string; label: string }
  | { type: "item"; sectionId: string; itemId: string; label: string };

const fieldLabelClass = "text-carbon/60 text-xs uppercase tracking-wider";

const AdminFaqEditor = () => {
  const { toast } = useToast();
  const [row, setRow] = useState<ContentRow | null>(null);
  const [draft, setDraft] = useState<FaqPageConfig>(() => cloneFaqConfig(DEFAULT_FAQ));
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string | null>(DEFAULT_FAQ.sections[0]?.id ?? null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const serializedDraft = useMemo(() => serializeFaqConfig(draft), [draft]);
  const isDirty = serializedDraft !== savedSnapshot;
  const pendingCount = useMemo(
    () =>
      draft.sections.reduce(
        (total, section) => total + section.items.filter((item) => isPendingFaqAnswer(item.answer)).length,
        0,
      ),
    [draft.sections],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("site_content")
        .select("id, key, title, content")
        .eq("key", FAQ_CONTENT_KEY)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast({
          title: "No se pudo cargar el FAQ",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const parsed = parseFaqConfig(data?.content);
      setRow(data ?? null);
      setDraft(parsed);
      setSavedSnapshot(serializeFaqConfig(parsed));
      setOpenSectionId(parsed.sections[0]?.id ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const updatePage = <K extends keyof FaqPageConfig>(key: K, value: FaqPageConfig[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateSection = (sectionId: string, updater: (section: FaqSection) => FaqSection) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  };

  const updateItem = (sectionId: string, itemId: string, updater: (item: FaqItem) => FaqItem) => {
    updateSection(sectionId, (section) => ({
      ...section,
      items: section.items.map((item) => (item.id === itemId ? updater(item) : item)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      key: FAQ_CONTENT_KEY,
      title: "Preguntas frecuentes",
      content: serializedDraft,
      updated_at: new Date().toISOString(),
    };

    try {
      if (row?.id) {
        const { error } = await (supabase as any)
          .from("site_content")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("site_content")
          .insert(payload)
          .select("id, key, title, content")
          .single();
        if (error) throw error;
        setRow(data);
      }
      setSavedSnapshot(serializedDraft);
      invalidateFaqPageVisibleCache();
      toast({
        title: "FAQ guardado",
        description: draft.pageVisible
          ? "Los cambios ya son visibles en la web."
          : "La página sigue oculta. Actívala cuando quieras publicarla.",
      });
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

  const handleReset = () => {
    const next = cloneFaqConfig(DEFAULT_FAQ);
    setDraft(next);
    setOpenSectionId(next.sections[0]?.id ?? null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "section") {
      setDraft((prev) => ({
        ...prev,
        sections: prev.sections.filter((section) => section.id !== deleteTarget.sectionId),
      }));
      if (openSectionId === deleteTarget.sectionId) {
        setOpenSectionId(null);
      }
    } else {
      updateSection(deleteTarget.sectionId, (section) => ({
        ...section,
        items: section.items.filter((item) => item.id !== deleteTarget.itemId),
      }));
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Cargando FAQ" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-playfair text-xl font-semibold text-carbon">FAQ</h2>
          <p className="text-carbon/40 text-sm mt-1 max-w-2xl">
            Edita secciones, preguntas y el mensaje final de ayuda. Las respuestas pendientes
            aparecen marcadas para que las completes con la información oficial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Label htmlFor="faq-page-visible" className="text-sm text-carbon/70 cursor-pointer">
              Página visible
            </Label>
            <Switch
              id="faq-page-visible"
              checked={draft.pageVisible}
              onCheckedChange={(checked) => updatePage("pageVisible", checked)}
            />
          </div>
          <Link
            to={FAQ_PAGE_PATH}
            className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline"
          >
            {draft.pageVisible ? "Ver página" : "Vista previa"}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      {!draft.pageVisible ? (
        <p className="text-sm text-carbon/60 bg-white border border-gold/15 rounded-lg px-4 py-3">
          La página está oculta. No aparece en el menú y quien visite la URL verá un 404.
          Actívala y pulsa Guardar para publicarla.
        </p>
      ) : null}

      {pendingCount > 0 ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Hay {pendingCount} {pendingCount === 1 ? "respuesta pendiente" : "respuestas pendientes"} de completar.
        </p>
      ) : null}

      <section className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 md:p-6 space-y-5">
        <h3 className="font-playfair text-lg font-semibold text-carbon">Cabecera de la página</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className={fieldLabelClass}>Antetítulo</Label>
            <Input className="mt-1" value={draft.eyebrow} onChange={(e) => updatePage("eyebrow", e.target.value)} />
          </div>
          <div>
            <Label className={fieldLabelClass}>Título</Label>
            <Input className="mt-1" value={draft.title} onChange={(e) => updatePage("title", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className={fieldLabelClass}>Introducción</Label>
          <Textarea
            className="mt-1 min-h-[88px]"
            value={draft.intro}
            onChange={(e) => updatePage("intro", e.target.value)}
          />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 md:p-6 space-y-5">
        <h3 className="font-playfair text-lg font-semibold text-carbon">Mensaje final de ayuda</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className={fieldLabelClass}>Título</Label>
            <Input className="mt-1" value={draft.helpTitle} onChange={(e) => updatePage("helpTitle", e.target.value)} />
          </div>
          <div>
            <Label className={fieldLabelClass}>Subtítulo</Label>
            <Input
              className="mt-1"
              value={draft.helpSubtitle}
              onChange={(e) => updatePage("helpSubtitle", e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label className={fieldLabelClass}>Texto</Label>
          <Textarea
            className="mt-1 min-h-[88px]"
            value={draft.helpBody}
            onChange={(e) => updatePage("helpBody", e.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className={fieldLabelClass}>Texto del botón</Label>
            <Input
              className="mt-1"
              value={draft.helpCtaLabel}
              onChange={(e) => updatePage("helpCtaLabel", e.target.value)}
            />
          </div>
          <div>
            <Label className={fieldLabelClass}>Enlace del botón</Label>
            <Input
              className="mt-1"
              value={draft.helpCtaHref}
              onChange={(e) => updatePage("helpCtaHref", e.target.value)}
              placeholder="mailto:info@shennabrows.com"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-playfair text-lg font-semibold text-carbon">Secciones y preguntas</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const section = createFaqSection();
            setDraft((prev) => ({ ...prev, sections: [...prev.sections, section] }));
            setOpenSectionId(section.id);
          }}
        >
          <Plus className="h-4 w-4" />
          Añadir sección
        </Button>
      </div>

      <div className="space-y-4">
        {draft.sections.map((section, sectionIndex) => {
          const isOpen = openSectionId === section.id;
          const sectionPending = section.items.filter((item) => isPendingFaqAnswer(item.answer)).length;
          return (
            <section
              key={section.id}
              className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setOpenSectionId(isOpen ? null : section.id)}
                  aria-expanded={isOpen}
                >
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-gold transition-transform", isOpen ? "rotate-180" : "")}
                    aria-hidden
                  />
                  <span className="font-medium text-carbon truncate">{section.title || "Sin título"}</span>
                  <span className="text-xs text-carbon/40 shrink-0">
                    {section.items.length} {section.items.length === 1 ? "pregunta" : "preguntas"}
                  </span>
                  {sectionPending > 0 ? (
                    <Badge variant="outline" className="border-amber-200 text-amber-800 bg-amber-50">
                      {sectionPending} pendiente{sectionPending === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 pr-2">
                    <Label htmlFor={`section-visible-${section.id}`} className="text-xs text-carbon/50">
                      Visible
                    </Label>
                    <Switch
                      id={`section-visible-${section.id}`}
                      checked={section.visible}
                      onCheckedChange={(checked) =>
                        updateSection(section.id, (current) => ({ ...current, visible: checked }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={sectionIndex === 0}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        sections: moveArrayItem(prev.sections, sectionIndex, -1),
                      }))
                    }
                    aria-label="Subir sección"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={sectionIndex === draft.sections.length - 1}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        sections: moveArrayItem(prev.sections, sectionIndex, 1),
                      }))
                    }
                    aria-label="Bajar sección"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setDeleteTarget({ type: "section", sectionId: section.id, label: section.title })
                    }
                    aria-label="Eliminar sección"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isOpen ? (
                <div className="border-t border-gold/10 px-4 pb-5 pt-4 space-y-4">
                  <div>
                    <Label className={fieldLabelClass}>Título de la sección</Label>
                    <Input
                      className="mt-1"
                      value={section.title}
                      onChange={(e) =>
                        updateSection(section.id, (current) => ({ ...current, title: e.target.value }))
                      }
                    />
                  </div>

                  {section.items.map((faqItem, itemIndex) => (
                    <article
                      key={faqItem.id}
                      className="rounded-xl border border-gold/10 bg-cream/40 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs uppercase tracking-wider text-carbon/40">
                            Pregunta {itemIndex + 1}
                          </p>
                          {isPendingFaqAnswer(faqItem.answer) ? (
                            <Badge variant="outline" className="border-amber-200 text-amber-800 bg-amber-50">
                              Pendiente
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-2 pr-2">
                            <Label htmlFor={`item-visible-${faqItem.id}`} className="text-xs text-carbon/50">
                              Visible
                            </Label>
                            <Switch
                              id={`item-visible-${faqItem.id}`}
                              checked={faqItem.visible}
                              onCheckedChange={(checked) =>
                                updateItem(section.id, faqItem.id, (current) => ({
                                  ...current,
                                  visible: checked,
                                }))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={itemIndex === 0}
                            onClick={() =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                items: moveArrayItem(current.items, itemIndex, -1),
                              }))
                            }
                            aria-label="Subir pregunta"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={itemIndex === section.items.length - 1}
                            onClick={() =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                items: moveArrayItem(current.items, itemIndex, 1),
                              }))
                            }
                            aria-label="Bajar pregunta"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                type: "item",
                                sectionId: section.id,
                                itemId: faqItem.id,
                                label: faqItem.question,
                              })
                            }
                            aria-label="Eliminar pregunta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        value={faqItem.question}
                        onChange={(e) =>
                          updateItem(section.id, faqItem.id, (current) => ({
                            ...current,
                            question: e.target.value,
                          }))
                        }
                        placeholder="Pregunta"
                      />
                      <Textarea
                        className="min-h-[110px]"
                        value={faqItem.answer}
                        onChange={(e) =>
                          updateItem(section.id, faqItem.id, (current) => ({
                            ...current,
                            answer: e.target.value,
                          }))
                        }
                        placeholder="Respuesta. Puedes usar enlaces con [texto](/ruta) o [texto](https://...)"
                      />
                    </article>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateSection(section.id, (current) => ({
                        ...current,
                        items: [...current.items, createFaqItem()],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Añadir pregunta
                  </Button>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-4 z-20 flex flex-wrap justify-end gap-2 rounded-xl border border-gold/15 bg-white/95 backdrop-blur-sm p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-4 w-4" />
          Restaurar textos del documento
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="bg-gold hover:bg-gold/90 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar FAQ
        </Button>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "section" ? "¿Eliminar esta sección?" : "¿Eliminar esta pregunta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.label
                ? `Se eliminará «${deleteTarget.label}». Los cambios se aplican al guardar.`
                : "Esta acción se aplicará al guardar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminFaqEditor;
