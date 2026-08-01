import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Save } from "lucide-react";
import {
  DEFAULT_MARQUEE_CONFIG,
  DEFAULT_MARQUEE_ITEMS,
  marqueeItemsToText,
  marqueeTextToItems,
  parseMarqueeConfig,
  serializeMarqueeConfig,
  type MarqueeConfig,
} from "@/lib/marquee-content";
import {
  DEFAULT_COLLECTION_HEADLINE,
  parseCollectionHeadlineConfig,
  serializeCollectionHeadlineConfig,
  splitHeadlineByAccent,
  type CollectionHeadlineConfig,
} from "@/lib/collection-headline-content";
import { HexColorField, toPickerColor } from "@/components/admin/HexColorField";

interface ContentBlock {
  id: string;
  key: string;
  title: string;
  content: string;
}

type SavedSnapshot = Record<string, { title: string; content: string }>;

const CONTENT_LABELS: Record<string, string> = {
  index_brand_story: "Texto principal — Página de inicio",
  index_marquee: "Marquesina — Debajo del hero",
  index_collection_headline: "Titular — Entre marquesina y colección",
  about_section_1: "Sobre mí — Sección 1",
  about_section_2: "Sobre mí — Sección 2",
  about_section_3: "Sobre mí — Sección 3",
  about_section_4: "Sobre mí — Sección 4",
};

const HIDDEN_KEYS = new Set(["index_brand_story", "theme_config"]);

/** Orden preferido en el panel de Contenido */
const KEY_ORDER = [
  "index_marquee",
  "index_collection_headline",
  "about_section_1",
  "about_section_2",
  "about_section_3",
  "about_section_4",
];

const snapshotFromBlocks = (rows: ContentBlock[]): SavedSnapshot => {
  const map: SavedSnapshot = {};
  for (const row of rows) {
    map[row.key] = { title: row.title ?? "", content: row.content ?? "" };
  }
  return map;
};

const isHex = (value: string) =>
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const AdminContentEditor = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [saved, setSaved] = useState<SavedSnapshot>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [marqueeDraft, setMarqueeDraft] = useState<{
    texts: string;
    background: string;
    /** String para permitir vaciar el input al editar. */
    paddingY: string;
  }>({
    texts: marqueeItemsToText(DEFAULT_MARQUEE_ITEMS),
    background: DEFAULT_MARQUEE_CONFIG.background,
    paddingY: String(DEFAULT_MARQUEE_CONFIG.paddingY),
  });
  const [headlineDraft, setHeadlineDraft] = useState<{
    text: string;
    accent: string;
    color: string;
    accentColor: string;
    fontSize: string;
  }>({
    text: DEFAULT_COLLECTION_HEADLINE.text,
    accent: DEFAULT_COLLECTION_HEADLINE.accent,
    color: DEFAULT_COLLECTION_HEADLINE.color,
    accentColor: DEFAULT_COLLECTION_HEADLINE.accentColor,
    fontSize: String(DEFAULT_COLLECTION_HEADLINE.fontSize),
  });

  const parsePaddingY = (raw: string): number => {
    if (raw.trim() === "") return DEFAULT_MARQUEE_CONFIG.paddingY;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_MARQUEE_CONFIG.paddingY;
    return Math.max(0, Math.min(96, Math.round(n)));
  };

  const parseFontSize = (raw: string): number => {
    if (raw.trim() === "") return DEFAULT_COLLECTION_HEADLINE.fontSize;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_COLLECTION_HEADLINE.fontSize;
    return Math.max(14, Math.min(96, Math.round(n)));
  };

  const buildMarqueePayload = () => {
    const bg = marqueeDraft.background.trim();
    const background = isHex(bg) ? bg : DEFAULT_MARQUEE_CONFIG.background;
    const config: MarqueeConfig = {
      items: marqueeTextToItems(marqueeDraft.texts),
      background,
      paddingY: parsePaddingY(marqueeDraft.paddingY),
    };
    return {
      title: "Marquesina del inicio",
      content: serializeMarqueeConfig(config),
      config,
    };
  };

  const buildHeadlinePayload = () => {
    const color = isHex(headlineDraft.color)
      ? headlineDraft.color.trim()
      : DEFAULT_COLLECTION_HEADLINE.color;
    const accentColor = isHex(headlineDraft.accentColor)
      ? headlineDraft.accentColor.trim()
      : DEFAULT_COLLECTION_HEADLINE.accentColor;
    const config: CollectionHeadlineConfig = {
      text: headlineDraft.text.trim() || DEFAULT_COLLECTION_HEADLINE.text,
      accent: headlineDraft.accent.trim(),
      color,
      accentColor,
      fontSize: parseFontSize(headlineDraft.fontSize),
    };
    return {
      title: "Titular de colección",
      content: serializeCollectionHeadlineConfig(config),
      config,
    };
  };

  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("site_content")
        .select("*")
        .order("key");

      if (error) {
        setLoading(false);
        return;
      }

      let rows: ContentBlock[] = data || [];

      const hasMarquee = rows.some((b) => b.key === "index_marquee");
      if (!hasMarquee) {
        const seed: MarqueeConfig = {
          items: [...DEFAULT_MARQUEE_ITEMS],
          background: DEFAULT_MARQUEE_CONFIG.background,
          paddingY: DEFAULT_MARQUEE_CONFIG.paddingY,
        };
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "index_marquee",
            title: "Marquesina del inicio",
            content: serializeMarqueeConfig(seed),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const hasHeadline = rows.some((b) => b.key === "index_collection_headline");
      if (!hasHeadline) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "index_collection_headline",
            title: "Titular de colección",
            content: serializeCollectionHeadlineConfig(DEFAULT_COLLECTION_HEADLINE),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const marqueeRow = rows.find((b) => b.key === "index_marquee");
      if (marqueeRow) {
        const cfg = parseMarqueeConfig(marqueeRow.content);
        setMarqueeDraft({
          texts: marqueeItemsToText(cfg.items),
          background: cfg.background,
          paddingY: String(cfg.paddingY),
        });
        marqueeRow.title = "Marquesina del inicio";
        marqueeRow.content = serializeMarqueeConfig(cfg);
      }

      const headlineRow = rows.find((b) => b.key === "index_collection_headline");
      if (headlineRow) {
        const cfg = parseCollectionHeadlineConfig(headlineRow.content);
        setHeadlineDraft({
          text: cfg.text,
          accent: cfg.accent,
          color: cfg.color,
          accentColor: cfg.accentColor,
          fontSize: String(cfg.fontSize),
        });
        headlineRow.title = "Titular de colección";
        headlineRow.content = serializeCollectionHeadlineConfig(cfg);
      }

      setBlocks(rows);
      setSaved(snapshotFromBlocks(rows));
      setLoading(false);
    };

    load();
  }, []);

  const updateField = (key: string, field: "title" | "content", value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.key === key ? { ...b, [field]: value } : b))
    );
  };

  const isBlockDirty = (block: ContentBlock): boolean => {
    const baseline = saved[block.key];
    if (!baseline) return true;
    if (block.key === "index_marquee") {
      const payload = buildMarqueePayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    if (block.key === "index_collection_headline") {
      const payload = buildHeadlinePayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    return (block.title ?? "") !== baseline.title || (block.content ?? "") !== baseline.content;
  };

  const saveBlock = async (block: ContentBlock) => {
    if (!isBlockDirty(block)) return;
    setSaving(block.key);

    let payload = { title: block.title, content: block.content };

    if (block.key === "index_marquee") {
      const { title, content, config } = buildMarqueePayload();
      payload = { title, content };
      setMarqueeDraft({
        background: config.background,
        paddingY: String(config.paddingY),
        texts: marqueeItemsToText(config.items),
      });
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "index_marquee" ? { ...b, title: payload.title, content: payload.content } : b
        )
      );
    }

    if (block.key === "index_collection_headline") {
      const { title, content, config } = buildHeadlinePayload();
      payload = { title, content };
      setHeadlineDraft({
        text: config.text,
        accent: config.accent,
        color: config.color,
        accentColor: config.accentColor,
        fontSize: String(config.fontSize),
      });
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "index_collection_headline"
            ? { ...b, title: payload.title, content: payload.content }
            : b
        )
      );
    }

    const { error } = await (supabase as any)
      .from("site_content")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", block.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    } else {
      setSaved((prev) => ({
        ...prev,
        [block.key]: { title: payload.title ?? "", content: payload.content ?? "" },
      }));
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

  const visibleBlocks = blocks
    .filter((block) => !HIDDEN_KEYS.has(block.key))
    .sort((a, b) => {
      const ai = KEY_ORDER.indexOf(a.key);
      const bi = KEY_ORDER.indexOf(b.key);
      const aPos = ai === -1 ? KEY_ORDER.length : ai;
      const bPos = bi === -1 ? KEY_ORDER.length : bi;
      return aPos - bPos || a.key.localeCompare(b.key);
    });

  const headlinePreviewParts = splitHeadlineByAccent(headlineDraft.text, headlineDraft.accent);
  const headlinePreviewSize = parseFontSize(headlineDraft.fontSize);

  return (
    <div className="space-y-6">
      {visibleBlocks.map((block) => {
        const isMarquee = block.key === "index_marquee";
        const isHeadline = block.key === "index_collection_headline";
        const dirty = isBlockDirty(block);

        return (
          <div
            key={block.key}
            className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6"
          >
            <h3 className="font-playfair text-base font-semibold text-carbon mb-4">
              {CONTENT_LABELS[block.key] || block.key}
            </h3>

            <div className="space-y-4">
              {!isMarquee && !isHeadline && (
                <div>
                  <Label className="text-carbon/60 text-xs uppercase tracking-wider">Título</Label>
                  <Input
                    value={block.title}
                    onChange={(e) => updateField(block.key, "title", e.target.value)}
                    className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                  />
                </div>
              )}

              {isMarquee && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Color de fondo
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <HexColorField
                        value={marqueeDraft.background}
                        onChange={(hex) =>
                          setMarqueeDraft((prev) => ({ ...prev, background: hex }))
                        }
                        fallback={DEFAULT_MARQUEE_CONFIG.background}
                        aria-label="Color de fondo de la marquesina"
                        className="flex-1 min-w-0"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          toPickerColor(marqueeDraft.background) ===
                          toPickerColor(DEFAULT_MARQUEE_CONFIG.background)
                        }
                        onClick={() =>
                          setMarqueeDraft((prev) => ({
                            ...prev,
                            background: DEFAULT_MARQUEE_CONFIG.background,
                          }))
                        }
                        className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                        aria-label="Restaurar color original"
                        title="Restaurar color original"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Padding vertical (px)
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={marqueeDraft.paddingY}
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^\d]/g, "");
                          setMarqueeDraft((prev) => ({ ...prev, paddingY: next }));
                        }}
                        onBlur={() => {
                          setMarqueeDraft((prev) => ({
                            ...prev,
                            paddingY: String(parsePaddingY(prev.paddingY)),
                          }));
                        }}
                        className="border-gold/20 focus-visible:ring-gold/30"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          parsePaddingY(marqueeDraft.paddingY) ===
                          DEFAULT_MARQUEE_CONFIG.paddingY
                        }
                        onClick={() =>
                          setMarqueeDraft((prev) => ({
                            ...prev,
                            paddingY: String(DEFAULT_MARQUEE_CONFIG.paddingY),
                          }))
                        }
                        className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                        aria-label="Restaurar padding original"
                        title="Restaurar padding original (26px)"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-carbon/30 mt-1">
                      Espacio arriba y abajo (0–96 px).
                    </p>
                  </div>
                </div>
              )}

              {isHeadline && (
                <>
                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">Texto</Label>
                    <Input
                      value={headlineDraft.text}
                      onChange={(e) =>
                        setHeadlineDraft((prev) => ({ ...prev, text: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto en color de acento
                    </Label>
                    <Input
                      value={headlineDraft.accent}
                      onChange={(e) =>
                        setHeadlineDraft((prev) => ({ ...prev, accent: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder="tus cejas"
                    />
                    <p className="text-xs text-carbon/30 mt-1">
                      Debe coincidir con un fragmento del texto de arriba.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color del texto
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={headlineDraft.color}
                          onChange={(hex) =>
                            setHeadlineDraft((prev) => ({ ...prev, color: hex }))
                          }
                          fallback={DEFAULT_COLLECTION_HEADLINE.color}
                          aria-label="Color del titular"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(headlineDraft.color) ===
                            toPickerColor(DEFAULT_COLLECTION_HEADLINE.color)
                          }
                          onClick={() =>
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              color: DEFAULT_COLLECTION_HEADLINE.color,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color del texto"
                          title="Restaurar color del texto"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color de acento
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={headlineDraft.accentColor}
                          onChange={(hex) =>
                            setHeadlineDraft((prev) => ({ ...prev, accentColor: hex }))
                          }
                          fallback={DEFAULT_COLLECTION_HEADLINE.accentColor}
                          aria-label="Color de acento del titular"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(headlineDraft.accentColor) ===
                            toPickerColor(DEFAULT_COLLECTION_HEADLINE.accentColor)
                          }
                          onClick={() =>
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              accentColor: DEFAULT_COLLECTION_HEADLINE.accentColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color de acento"
                          title="Restaurar color de acento"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Tamaño (px)
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={headlineDraft.fontSize}
                          onChange={(e) => {
                            const next = e.target.value.replace(/[^\d]/g, "");
                            setHeadlineDraft((prev) => ({ ...prev, fontSize: next }));
                          }}
                          onBlur={() => {
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              fontSize: String(parseFontSize(prev.fontSize)),
                            }));
                          }}
                          className="border-gold/20 focus-visible:ring-gold/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            parseFontSize(headlineDraft.fontSize) ===
                            DEFAULT_COLLECTION_HEADLINE.fontSize
                          }
                          onClick={() =>
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              fontSize: String(DEFAULT_COLLECTION_HEADLINE.fontSize),
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar tamaño original"
                          title="Restaurar tamaño original (24px)"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-carbon/30 mt-1">14–96 px.</p>
                    </div>
                  </div>

                  <div
                    className="rounded-lg border border-carbon/10 px-4 py-6 text-center"
                    style={{ backgroundColor: "#F8F3EB" }}
                  >
                    <p
                      className="font-cormorant leading-snug"
                      style={{
                        color: isHex(headlineDraft.color)
                          ? headlineDraft.color
                          : DEFAULT_COLLECTION_HEADLINE.color,
                        fontSize: `${Math.min(headlinePreviewSize, 28)}px`,
                      }}
                    >
                      {headlinePreviewParts ? (
                        <>
                          {headlinePreviewParts.before}
                          <span
                            className="italic"
                            style={{
                              color: isHex(headlineDraft.accentColor)
                                ? headlineDraft.accentColor
                                : DEFAULT_COLLECTION_HEADLINE.accentColor,
                            }}
                          >
                            {headlinePreviewParts.accent}
                          </span>
                          {headlinePreviewParts.after}
                        </>
                      ) : (
                        headlineDraft.text || "…"
                      )}
                    </p>
                    <p className="text-xs text-carbon/30 mt-3">
                      Vista previa (tamaño web: {headlinePreviewSize}px)
                    </p>
                  </div>
                </>
              )}

              {!isHeadline && (
                <div>
                  <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                    {isMarquee ? "Textos (uno por línea)" : "Contenido"}
                  </Label>
                  <Textarea
                    value={isMarquee ? marqueeDraft.texts : block.content}
                    onChange={(e) => {
                      if (isMarquee) {
                        setMarqueeDraft((prev) => ({ ...prev, texts: e.target.value }));
                      } else {
                        updateField(block.key, "content", e.target.value);
                      }
                    }}
                    rows={isMarquee ? 8 : 4}
                    className="mt-1 border-gold/20 focus-visible:ring-gold/30 font-sans"
                  />
                  <p className="text-xs text-carbon/30 mt-1">
                    {isMarquee
                      ? "Cada línea es un texto de la marquesina en movimiento."
                      : "Separa los párrafos con líneas en blanco."}
                  </p>
                </div>
              )}

              {isMarquee && (
                <div
                  className="rounded-lg border border-carbon/10 overflow-hidden"
                  style={{
                    backgroundColor: marqueeDraft.background,
                    paddingTop: parsePaddingY(marqueeDraft.paddingY),
                    paddingBottom: parsePaddingY(marqueeDraft.paddingY),
                  }}
                >
                  <p className="px-4 text-center font-sans text-[0.65rem] font-medium uppercase tracking-[0.28em] text-carbon/70">
                    Vista previa · {marqueeTextToItems(marqueeDraft.texts)[0] || "…"}
                  </p>
                </div>
              )}

              <Button
                onClick={() => saveBlock(block)}
                disabled={!dirty || saving === block.key}
                className="bg-gold hover:bg-gold/90 text-white disabled:opacity-40"
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
        );
      })}
    </div>
  );
};

export default AdminContentEditor;
