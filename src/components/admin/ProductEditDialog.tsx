import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProductImageUrl } from "@/lib/product-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon, Plus, X, Bold, Italic, List, ListOrdered, Link as LinkIcon } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { normalizeHex, parseColorVariants, type ColorVariant } from "@/lib/color-variants";

type Product = Tables<"products">;

type ColorVariantFormRow = ColorVariant & { hexDraft: string | null };

interface ProductEditDialogProps {
  product: Product | null;
  /** En creación, `product` debe ser `null`. */
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const slugify = (raw: string): string => {
  const s = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "producto";
};

const BUCKET = "product-images";
const SUPABASE_URL = "https://vanhsuisvxvclxdgutaw.supabase.co";

const normalizeDescriptionHtml = (html: string) => {
  const trimmed = (html || "").trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/<div>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
};

const parseGalleryFromImageUrl = (imageUrl: string | null | undefined): string[] => {
  if (!imageUrl) return [];
  const normalized = imageUrl.trim();
  if (!normalized) return [];
  if (normalized.startsWith("[")) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
      }
    } catch {
      // Legacy value: continue as single URL.
    }
  }
  return [normalized];
};

const ProductEditDialog = ({ product, mode, open, onOpenChange, onSaved }: ProductEditDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Product & { materials_label?: string }>>({});
  const [materialItems, setMaterialItems] = useState<string[]>([""]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [colorVariantRows, setColorVariantRows] = useState<ColorVariantFormRow[]>([]);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);

  const currentProduct = product;
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setMaterialItems([""]);
      setForm({
        name: "",
        tagline: "",
        description: "",
        materials: "",
        shipping_info: "",
        price: 0,
        stock: 0,
        image_url: null,
        materials_label: "materiales",
        is_pack: false,
      });
      setImageUrls([]);
      setColorVariantRows([]);
      if (descriptionEditorRef.current) descriptionEditorRef.current.innerHTML = "";
      return;
    }
    if (!currentProduct) return;
    const items = (currentProduct as any).materials
      ? (currentProduct as any).materials.split("\n").filter((s: string) => s.trim())
      : [""];
    setMaterialItems(items.length > 0 ? items : [""]);
    setForm({
      name: currentProduct.name,
      tagline: currentProduct.tagline,
      description: currentProduct.description,
      materials: currentProduct.materials,
      shipping_info: currentProduct.shipping_info,
      price: currentProduct.price,
      stock: currentProduct.stock,
      image_url: currentProduct.image_url,
      materials_label: (currentProduct as any).materials_label || "materiales",
      is_pack: currentProduct.is_pack ?? false,
    });
    setImageUrls(parseGalleryFromImageUrl(currentProduct.image_url));
    const parsed = parseColorVariants(currentProduct.color_variants);
    setColorVariantRows(parsed.map((v) => ({ ...v, hexDraft: null })));
  }, [currentProduct, mode, open]);

  const updateField = (field: keyof Product, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!descriptionEditorRef.current) return;
    const next = form.description || "";
    if (descriptionEditorRef.current.innerHTML !== next) {
      descriptionEditorRef.current.innerHTML = next;
    }
  }, [form.description, mode, currentProduct?.id, open]);

  const isComposicion = (form as any).materials_label === 'composicion';

  const handleMaterialChange = (index: number, value: string) => {
    setMaterialItems((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addMaterialItem = () => {
    // Don't add if last item is empty
    const last = materialItems[materialItems.length - 1];
    if (!last || !last.trim()) return;
    setMaterialItems((prev) => [...prev, ""]);
  };

  const removeMaterialItem = (index: number) => {
    if (materialItems.length <= 1) {
      setMaterialItems([""]);
      return;
    }
    setMaterialItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addColorVariantRow = () => {
    setColorVariantRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", hex: "#B8956A", hexDraft: null },
    ]);
  };

  const removeColorVariantRow = (index: number) => {
    setColorVariantRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateColorVariantName = (index: number, name: string) => {
    setColorVariantRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], name };
      return next;
    });
  };

  const updateColorVariantFromPicker = (index: number, hexFromPicker: string) => {
    const n = normalizeHex(hexFromPicker);
    if (!n) return;
    setColorVariantRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], hex: n, hexDraft: null };
      return next;
    });
  };

  const updateColorVariantHexDraft = (index: number, draft: string) => {
    setColorVariantRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], hexDraft: draft };
      return next;
    });
  };

  const commitColorVariantHexInput = (index: number) => {
    let invalid = false;
    setColorVariantRows((prev) => {
      const row = prev[index];
      if (!row) return prev;
      const n = normalizeHex(row.hexDraft ?? row.hex);
      if (!n) {
        invalid = true;
        return prev.map((r, i) => (i === index ? { ...r, hexDraft: null } : r));
      }
      return prev.map((r, i) => (i === index ? { ...r, hex: n, hexDraft: null } : r));
    });
    if (invalid) {
      toast({
        title: "Código de color no válido",
        description: "Usa formato hexadecimal, por ejemplo #D4A5A5 o #RGB.",
        variant: "destructive",
      });
    }
  };

  const colorPickerValue = (row: ColorVariantFormRow) => normalizeHex(row.hexDraft ?? row.hex) ?? row.hex;

  const uploadImage = useCallback(
    async (file: File) => {
      if (mode !== "create" && !currentProduct) return;
      setUploading(true);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const nameForSlug = (form.name || "").trim();
        const slugBase =
          mode === "create"
            ? (nameForSlug ? slugify(nameForSlug) : `borrador-${Date.now()}`)
            : (currentProduct?.slug ?? "producto");
        const filePath = `${slugBase}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
        setImageUrls((prev) => {
          const next = [...prev, publicUrl];
          setForm((formPrev) => ({ ...formPrev, image_url: JSON.stringify(next) }));
          return next;
        });
        toast({ title: "Imagen subida correctamente", description: "La imagen se añadió a la galería del producto." });
      } catch (err: any) {
        toast({ title: "Error al subir imagen", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [currentProduct, form.name, mode, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
      files.forEach((file) => {
        uploadImage(file);
      });
    },
    [uploadImage]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/"));
    files.forEach((file) => {
      uploadImage(file);
    });
    e.target.value = "";
  };

  const removeImageAt = (index: number) => {
    setImageUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setForm((formPrev) => ({ ...formPrev, image_url: next.length > 0 ? JSON.stringify(next) : null }));
      return next;
    });
  };

  const setPrimaryImage = (index: number) => {
    setImageUrls((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      setForm((formPrev) => ({ ...formPrev, image_url: JSON.stringify(next) }));
      return next;
    });
  };

  const handleSave = async () => {
    const materialsString = materialItems.filter((m) => m.trim()).join("\n");
    const normalizedDescription = normalizeDescriptionHtml(String(form.description || ""));

    const colorVariantsPayload: ColorVariant[] = [];
    for (const r of colorVariantRows) {
      const name = r.name.trim();
      const hex = normalizeHex(r.hexDraft ?? r.hex);
      if (!name && !hex) continue;
      if (!name || !hex) {
        toast({
          title: "Variantes de color incompletas",
          description: "Cada variante necesita nombre y un color válido (#RRGGBB), o elimina la fila.",
          variant: "destructive",
        });
        return;
      }
      colorVariantsPayload.push({ id: r.id, name, hex });
    }

    if (mode === "create") {
      const name = (form.name || "").trim();
      if (!name) {
        toast({ title: "Falta el nombre", description: "Indica un nombre para el producto.", variant: "destructive" });
        return;
      }
      const slugFinal = slugify(name);
      setSaving(true);
      const { error } = await (supabase as any).from("products").insert({
        name,
        slug: slugFinal,
        category: "otros",
        tagline: form.tagline || "",
        description: normalizedDescription || null,
        materials: materialsString || null,
        materials_label: (form as any).materials_label || "materiales",
        shipping_info: form.shipping_info || "",
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        is_pack: Boolean(form.is_pack),
        color_variants: colorVariantsPayload,
      });

      if (error) {
        toast({ title: "Error al crear", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Producto creado correctamente" });
        onSaved();
        onOpenChange(false);
      }
      setSaving(false);
      return;
    }

    if (!currentProduct) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("products")
      .update({
        name: form.name,
        tagline: form.tagline || "",
        description: normalizedDescription,
        materials: materialsString,
        materials_label: (form as any).materials_label || "materiales",
        shipping_info: form.shipping_info || "",
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        is_pack: Boolean(form.is_pack),
        color_variants: colorVariantsPayload,
      })
      .eq("id", currentProduct.id);

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Producto actualizado correctamente" });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const displayImage =
    imageUrls[0] ||
    (currentProduct
      ? getProductImageUrl(currentProduct.image_url, currentProduct.slug)
      : getProductImageUrl(form.image_url, slugify((form.name || "").trim() || "nuevo")));
  const canAddMaterial = materialItems.length === 0 || (materialItems[materialItems.length - 1]?.trim() ?? "") !== "";

  const applyFormat = (command: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList") => {
    document.execCommand(command);
    descriptionEditorRef.current?.focus();
    updateField("description", normalizeDescriptionHtml(descriptionEditorRef.current?.innerHTML || ""));
  };

  const insertLink = () => {
    const url = window.prompt("Introduce la URL del enlace (https://...)");
    if (!url) return;
    document.execCommand("createLink", false, url);
    descriptionEditorRef.current?.focus();
    updateField("description", normalizeDescriptionHtml(descriptionEditorRef.current?.innerHTML || ""));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-cream">
        <DialogHeader>
          <DialogTitle className="font-playfair text-xl text-carbon">
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Image Drop Zone */}
          <div>
            <Label className="text-carbon/70 text-xs uppercase tracking-wider mb-2 block">
              Imagen del producto
            </Label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden
                ${isDragging ? "border-gold bg-gold/5 scale-[1.01]" : "border-gold/20 hover:border-gold/40"}
                ${displayImage ? "aspect-video" : "aspect-video flex items-center justify-center"}
              `}
            >
              {uploading && (
                <div className="absolute inset-0 bg-carbon/40 flex items-center justify-center z-10 rounded-xl">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-carbon/40">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-sm">Arrastra una o varias imágenes, o haz clic</span>
                </div>
              )}
              {displayImage && !uploading && (
                <div className="absolute inset-0 bg-carbon/0 hover:bg-carbon/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="flex items-center gap-2 text-white bg-carbon/60 rounded-lg px-4 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    Añadir más imágenes
                  </div>
                </div>
              )}
            </div>
            {imageUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                {imageUrls.map((url, index) => (
                  <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gold/20">
                    <img src={url} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-gold text-white px-1.5 py-0.5 rounded">
                        Principal
                      </span>
                    )}
                    <div className="absolute inset-0 bg-carbon/0 group-hover:bg-carbon/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      {index !== 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryImage(index);
                          }}
                        >
                          Principal
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImageAt(index);
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Text Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="name" className="text-carbon/70 text-xs uppercase tracking-wider">
                Nombre
              </Label>
              <Input
                id="name"
                value={form.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 bg-white border-gold/15"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="tagline" className="text-carbon/70 text-xs uppercase tracking-wider">
                Subtítulo
              </Label>
              <Input
                id="tagline"
                value={form.tagline || ""}
                onChange={(e) => updateField("tagline", e.target.value)}
                className="mt-1 bg-white border-gold/15"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gold/15 bg-white/60 px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="is_pack" className="text-carbon/70 text-xs uppercase tracking-wider">
                  Es pack (tienda)
                </Label>
                <p id="is_pack-hint" className="text-xs text-carbon/45 mt-1 leading-snug">
                  Si está activo, el artículo se muestra solo en la sección Packs de la página Tienda, no junto al resto de productos sueltos.
                </p>
              </div>
              <Switch
                id="is_pack"
                checked={Boolean(form.is_pack)}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_pack: checked }))}
                className="shrink-0 data-[state=checked]:bg-gold"
                aria-describedby="is_pack-hint"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description" className="text-carbon/70 text-xs uppercase tracking-wider">
                Descripción
              </Label>
              <div className="mt-1 rounded-md border border-gold/15 bg-white overflow-hidden">
                <div className="flex flex-wrap items-center gap-1 border-b border-gold/10 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 border-gold/20"
                    onClick={() => applyFormat("bold")}
                    aria-label="Negrita"
                  >
                    <Bold size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 border-gold/20"
                    onClick={() => applyFormat("italic")}
                    aria-label="Cursiva"
                  >
                    <Italic size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 border-gold/20"
                    onClick={() => applyFormat("insertUnorderedList")}
                    aria-label="Lista con viñetas"
                  >
                    <List size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 border-gold/20"
                    onClick={() => applyFormat("insertOrderedList")}
                    aria-label="Lista numerada"
                  >
                    <ListOrdered size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 border-gold/20"
                    onClick={insertLink}
                    aria-label="Insertar enlace"
                  >
                    <LinkIcon size={14} />
                  </Button>
                </div>
                <div
                  id="description"
                  ref={descriptionEditorRef}
                  contentEditable
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      document.execCommand("insertParagraph");
                    }
                  }}
                  onInput={(e) => updateField("description", normalizeDescriptionHtml((e.target as HTMLDivElement).innerHTML))}
                  className="min-h-[140px] p-3 text-sm text-carbon leading-relaxed focus:outline-none [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_a]:text-gold [&_a]:underline"
                />
              </div>
              <p className="text-xs text-carbon/40 mt-1">Enter crea un párrafo nuevo. Shift+Enter crea salto de línea.</p>
            </div>

            {/* Materials / Composición section */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-carbon/70 text-xs uppercase tracking-wider">
                  {isComposicion ? 'Composición' : 'Materiales'}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-carbon/40">Materiales</span>
                  <Switch
                    checked={isComposicion}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, materials_label: checked ? 'composicion' : 'materiales' }))
                    }
                  />
                  <span className="text-xs text-carbon/40">Composición</span>
                </div>
              </div>

              <div className="space-y-2">
                {materialItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gold/60 text-xs shrink-0 w-5 text-center">✦</span>
                    <Input
                      value={item}
                      onChange={(e) => handleMaterialChange(index, e.target.value)}
                      placeholder={isComposicion ? `Ingrediente ${index + 1}` : `Material ${index + 1}`}
                      className="bg-white border-gold/15 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeMaterialItem(index)}
                      className="text-carbon/30 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMaterialItem}
                disabled={!canAddMaterial}
                className="mt-2 border-gold/20 text-gold hover:bg-gold/5 disabled:opacity-30"
              >
                <Plus size={14} className="mr-1" />
                Añadir {isComposicion ? 'ingrediente' : 'material'}
              </Button>
            </div>

            {/* Variantes de color */}
            <div className="sm:col-span-2 rounded-xl border border-gold/15 bg-white/60 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <Label className="text-carbon/70 text-xs uppercase tracking-wider">Variantes de color</Label>
                  <p className="text-xs text-carbon/45 mt-1 leading-snug">
                    Opcional. En la tienda se muestran como círculos para elegir color. Usa el selector o escribe el código hex.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addColorVariantRow}
                  className="shrink-0 border-gold/20 text-gold hover:bg-gold/5"
                >
                  <Plus size={14} className="mr-1" />
                  Añadir variante
                </Button>
              </div>
              {colorVariantRows.length === 0 ? (
                <p className="text-sm text-carbon/40 italic">Sin variantes. El producto se vende sin elegir color.</p>
              ) : (
                <div className="space-y-3">
                  {colorVariantRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end p-3 rounded-lg border border-gold/10 bg-white/80"
                    >
                      <div className="flex-1 min-w-[140px]">
                        <Label className="text-[10px] uppercase tracking-wider text-carbon/50">Nombre visible</Label>
                        <Input
                          value={row.name}
                          onChange={(e) => updateColorVariantName(index, e.target.value)}
                          placeholder="Ej. Rosa empolvado"
                          className="mt-1 bg-white border-gold/15 text-sm"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-carbon/50">Selector</Label>
                          <input
                            type="color"
                            aria-label={`Color para ${row.name || "variante"}`}
                            value={colorPickerValue(row)}
                            onChange={(e) => updateColorVariantFromPicker(index, e.target.value)}
                            className="mt-1 h-10 w-14 cursor-pointer rounded-md border border-gold/20 bg-white p-0.5"
                          />
                        </div>
                        <div className="flex-1 min-w-[120px] sm:w-36">
                          <Label className="text-[10px] uppercase tracking-wider text-carbon/50">Código hex</Label>
                          <Input
                            value={row.hexDraft ?? row.hex}
                            onChange={(e) => updateColorVariantHexDraft(index, e.target.value)}
                            onBlur={() => commitColorVariantHexInput(index)}
                            placeholder="#RRGGBB"
                            spellCheck={false}
                            className="mt-1 bg-white border-gold/15 text-sm font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeColorVariantRow(index)}
                          className="text-carbon/30 hover:text-red-400 transition-colors p-2 shrink-0"
                          aria-label="Quitar variante"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="shipping_info" className="text-carbon/70 text-xs uppercase tracking-wider">
                Info de envío
              </Label>
              <Textarea
                id="shipping_info"
                value={form.shipping_info || ""}
                onChange={(e) => updateField("shipping_info", e.target.value)}
                className="mt-1 bg-white border-gold/15"
              />
            </div>
            <div>
              <Label htmlFor="price" className="text-carbon/70 text-xs uppercase tracking-wider">
                Precio (€)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={form.price ?? 0}
                onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
                className="mt-1 bg-white border-gold/15"
              />
            </div>
            <div>
              <Label htmlFor="stock" className="text-carbon/70 text-xs uppercase tracking-wider">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                value={form.stock ?? 0}
                onChange={(e) => updateField("stock", parseInt(e.target.value) || 0)}
                className="mt-1 bg-white border-gold/15"
              />
            </div>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gold hover:bg-gold/90 text-white h-11 text-sm font-medium"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "create" ? "Crear producto" : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditDialog;
