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

type Product = Tables<"products">;

interface ProductEditDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

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

const ProductEditDialog = ({ product, open, onOpenChange, onSaved }: ProductEditDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Product & { materials_label?: string }>>({});
  const [materialItems, setMaterialItems] = useState<string[]>([""]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);

  // Sync form when product changes
  const currentProduct = product;
  useEffect(() => {
    if (!currentProduct || !open) return;
    const items = (currentProduct as any).materials
      ? (currentProduct as any).materials.split('\n').filter((s: string) => s.trim())
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
      materials_label: (currentProduct as any).materials_label || 'materiales',
    });
    setPreviewUrl(null);
  }, [currentProduct, open]);

  const updateField = (field: keyof Product, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!descriptionEditorRef.current) return;
    const next = form.description || "";
    if (descriptionEditorRef.current.innerHTML !== next) {
      descriptionEditorRef.current.innerHTML = next;
    }
  }, [form.description, currentProduct?.id, open]);

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

  const uploadImage = useCallback(
    async (file: File) => {
      if (!currentProduct) return;
      setUploading(true);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${currentProduct.slug}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
        setForm((prev) => ({ ...prev, image_url: publicUrl }));
        setPreviewUrl(publicUrl);
        toast({ title: "Imagen subida correctamente" });
      } catch (err: any) {
        toast({ title: "Error al subir imagen", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [currentProduct, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) uploadImage(file);
    },
    [uploadImage]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const handleSave = async () => {
    if (!currentProduct) return;
    setSaving(true);
    const materialsString = materialItems.filter((m) => m.trim()).join('\n');
    const normalizedDescription = normalizeDescriptionHtml(String(form.description || ""));
    const { error } = await (supabase as any)
      .from("products")
      .update({
        name: form.name,
        tagline: form.tagline || "",
        description: normalizedDescription,
        materials: materialsString,
        materials_label: (form as any).materials_label || 'materiales',
        shipping_info: form.shipping_info || "",
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        image_url: form.image_url,
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

  const displayImage = previewUrl || (currentProduct ? getProductImageUrl(currentProduct.image_url, currentProduct.slug) : form.image_url);
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
            Editar Producto
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
                  <span className="text-sm">Arrastra una imagen o haz clic</span>
                </div>
              )}
              {displayImage && !uploading && (
                <div className="absolute inset-0 bg-carbon/0 hover:bg-carbon/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="flex items-center gap-2 text-white bg-carbon/60 rounded-lg px-4 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    Cambiar imagen
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditDialog;
