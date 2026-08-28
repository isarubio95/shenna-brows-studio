import { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getProductImageUrl,
  parseProductImages,
  serializeProductImages,
} from "@/lib/product-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon, Plus, X, Bold, Italic, List, ListOrdered, Link as LinkIcon, Tag, ChevronLeft, ChevronRight, Crop } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { normalizeHex, parseColorVariants, type ColorVariant } from "@/lib/color-variants";
import { cn } from "@/lib/utils";
import ProductImageCropDialog from "@/components/admin/ProductImageCropDialog";

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

/** Slug de URL: prioriza la etiqueta dorada (category); si está vacía, el nombre del producto. */
const productSlugFromForm = (category: string | null | undefined, name: string | null | undefined) => {
  const cat = (category ?? "").trim();
  const nm = (name ?? "").trim();
  return slugify(cat || nm || "producto");
};

const slugPreviewDiffersFromStored = (
  storedSlug: string,
  category: string | null | undefined,
  name: string | null | undefined
) => storedSlug !== productSlugFromForm(category, name);

type SlugConflict = { slug: string; otherProductName: string };

async function fetchConflictingProductBySlug(
  slug: string,
  excludeProductId?: string
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await (supabase as any).from("products").select("id, name").eq("slug", slug);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; name: string }[];
  return rows.find((row) => row.id !== excludeProductId) ?? null;
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

const descriptionHtmlFromProduct = (mode: "create" | "edit", product: Product | null) =>
  mode === "create" || !product ? "" : String(product.description ?? "");

const applyDescriptionHtml = (node: HTMLDivElement | null, html: string) => {
  if (!node) return;
  if (node.innerHTML !== html) {
    node.innerHTML = html;
  }
};

const EMPTY_CREATE_FORM = {
  category: "",
  name: "",
  tagline: "",
  description: "",
  materials: "",
  shipping_info: "",
  price: 0,
  stock: 0,
  image_url: null as string | null,
  materials_label: "materiales",
  is_pack: false,
  is_on_sale: false,
  sale_price: null as number | null,
};

const buildProductSnapshot = (args: {
  form: Partial<Product & { materials_label?: string }>;
  materialItems: string[];
  imageUrls: string[];
  colorVariantRows: ColorVariantFormRow[];
}) => {
  const colors = args.colorVariantRows
    .map((r) => ({
      id: r.id,
      name: r.name.trim(),
      hex: (normalizeHex(r.hexDraft ?? r.hex) ?? "").toUpperCase(),
    }))
    .filter((c) => c.name || c.hex);

  return JSON.stringify({
    category: (args.form.category ?? "").trim(),
    name: (args.form.name ?? "").trim(),
    tagline: args.form.tagline ?? "",
    description: normalizeDescriptionHtml(String(args.form.description || "")),
    materials: args.materialItems.map((m) => m.trim()).filter(Boolean),
    materials_label: (args.form as { materials_label?: string }).materials_label || "materiales",
    shipping_info: args.form.shipping_info ?? "",
    price: Number(args.form.price) || 0,
    stock: Number(args.form.stock) || 0,
    image_urls: args.imageUrls,
    is_pack: Boolean(args.form.is_pack),
    is_on_sale: Boolean(args.form.is_on_sale),
    sale_price: args.form.is_on_sale ? Number(args.form.sale_price) : null,
    color_variants: colors,
  });
};

const ProductEditDialog = ({ product, mode, open, onOpenChange, onSaved }: ProductEditDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Product & { materials_label?: string }>>({});
  const [materialItems, setMaterialItems] = useState<string[]>([""]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbDragIndex, setThumbDragIndex] = useState<number | null>(null);
  const [thumbDragOverIndex, setThumbDragOverIndex] = useState<number | null>(null);
  const [colorVariantRows, setColorVariantRows] = useState<ColorVariantFormRow[]>([]);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const [slugConflict, setSlugConflict] = useState<SlugConflict | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState("");

  const currentProduct = product;
  useEffect(() => {
    if (open) return;
    setSlugConflict(null);
    setSlugChecking(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSlugConflict(null);
    setSlugChecking(false);
    if (mode === "create") {
      setMaterialItems([""]);
      setForm({ ...EMPTY_CREATE_FORM });
      setImageUrls([]);
      setPreviewIndex(0);
      setColorVariantRows([]);
      setBaselineSnapshot(
        buildProductSnapshot({
          form: EMPTY_CREATE_FORM,
          materialItems: [""],
          imageUrls: [],
          colorVariantRows: [],
        }),
      );
      return;
    }
    if (!currentProduct) return;
    const items = (currentProduct as any).materials
      ? (currentProduct as any).materials.split("\n").filter((s: string) => s.trim())
      : [""];
    const nextMaterials = items.length > 0 ? items : [""];
    const nextForm = {
      category: currentProduct.category,
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
      is_on_sale: currentProduct.is_on_sale ?? false,
      sale_price: currentProduct.sale_price ?? null,
    };
    const nextImages = parseProductImages(currentProduct.image_url);
    const parsed = parseColorVariants(currentProduct.color_variants);
    const nextColors = parsed.map((v) => ({ ...v, hexDraft: null as string | null }));
    setMaterialItems(nextMaterials);
    setForm(nextForm);
    setImageUrls(nextImages);
    setPreviewIndex(0);
    setColorVariantRows(nextColors);
    setBaselineSnapshot(
      buildProductSnapshot({
        form: nextForm,
        materialItems: nextMaterials,
        imageUrls: nextImages,
        colorVariantRows: nextColors,
      }),
    );
  }, [currentProduct, mode, open]);

  const isDirty = useMemo(() => {
    if (!baselineSnapshot) return false;
    return (
      buildProductSnapshot({ form, materialItems, imageUrls, colorVariantRows }) !== baselineSnapshot
    );
  }, [baselineSnapshot, form, materialItems, imageUrls, colorVariantRows]);

  const updateField = (field: keyof Product, value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateSaleFields = (): boolean => {
    if (!form.is_on_sale) return true;
    const regular = Number(form.price) || 0;
    const sale = Number(form.sale_price);
    if (!Number.isFinite(sale) || sale <= 0) {
      toast({
        title: "Precio de oferta requerido",
        description: "Introduce un precio de oferta mayor que 0.",
        variant: "destructive",
      });
      return false;
    }
    if (sale >= regular) {
      toast({
        title: "Precio de oferta no válido",
        description: "El precio de oferta debe ser menor que el precio habitual.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const salePayload = () => ({
    is_on_sale: Boolean(form.is_on_sale),
    sale_price: form.is_on_sale ? Number(form.sale_price) : null,
  });

  const verifySlugOnBlur = useCallback(async () => {
    setSlugChecking(true);
    try {
      const slug = productSlugFromForm(form.category, form.name);
      const excludeId = mode === "edit" && currentProduct ? currentProduct.id : undefined;
      const row = await fetchConflictingProductBySlug(slug, excludeId);
      setSlugConflict(row ? { slug, otherProductName: row.name } : null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      toast({ title: "No se pudo comprobar la URL", description: message, variant: "destructive" });
    } finally {
      setSlugChecking(false);
    }
  }, [form.category, form.name, mode, currentProduct, toast]);

  const descriptionSeedHtml = descriptionHtmlFromProduct(mode, currentProduct);
  const descriptionSeedRef = useRef(descriptionSeedHtml);
  descriptionSeedRef.current = descriptionSeedHtml;

  const setDescriptionEditorNode = useCallback((node: HTMLDivElement | null) => {
    descriptionEditorRef.current = node;
    applyDescriptionHtml(node, descriptionSeedRef.current);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    applyDescriptionHtml(descriptionEditorRef.current, descriptionSeedRef.current);
  }, [open, mode, currentProduct?.id, currentProduct?.description]);

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
        const nameForSlug = (form.category || "").trim() || (form.name || "").trim();
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
          setForm((formPrev) => ({ ...formPrev, image_url: serializeProductImages(next) }));
          setPreviewIndex(next.length - 1);
          return next;
        });
        toast({ title: "Imagen subida correctamente", description: "La imagen se añadió a la galería del producto." });
      } catch (err: any) {
        toast({ title: "Error al subir imagen", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [currentProduct, form.category, form.name, mode, toast]
  );

  const replaceImageAtIndex = useCallback(
    async (index: number, file: File) => {
      if (mode !== "create" && !currentProduct) return;
      if (index < 0) return;
      setUploading(true);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const nameForSlug = (form.category || "").trim() || (form.name || "").trim();
        const slugBase =
          mode === "create"
            ? (nameForSlug ? slugify(nameForSlug) : `borrador-${Date.now()}`)
            : (currentProduct?.slug ?? "producto");
        const filePath = `${slugBase}-crop-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

        if (uploadError) throw uploadError;

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
        setImageUrls((prev) => {
          if (index >= prev.length) return prev;
          const next = [...prev];
          next[index] = publicUrl;
          setForm((formPrev) => ({ ...formPrev, image_url: serializeProductImages(next) }));
          return next;
        });
        toast({ title: "Imagen recortada", description: "Se actualizó la imagen en la galería." });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "No se pudo guardar el recorte.";
        toast({ title: "Error al guardar recorte", description: message, variant: "destructive" });
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setUploading(false);
      }
    },
    [currentProduct, form.category, form.name, mode, toast],
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
      setForm((formPrev) => ({ ...formPrev, image_url: serializeProductImages(next) }));
      setPreviewIndex((current) => {
        if (next.length === 0) return 0;
        if (index < current) return current - 1;
        if (index === current) return Math.min(current, next.length - 1);
        return current;
      });
      return next;
    });
  };

  const reorderImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setImageUrls((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setForm((formPrev) => ({ ...formPrev, image_url: serializeProductImages(next) }));
      setPreviewIndex((current) => {
        if (current === fromIndex) return toIndex;
        if (fromIndex < current && toIndex >= current) return current - 1;
        if (fromIndex > current && toIndex <= current) return current + 1;
        return current;
      });
      return next;
    });
  };

  const showPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIndex((i) => (imageUrls.length === 0 ? 0 : (i - 1 + imageUrls.length) % imageUrls.length));
  };

  const showNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIndex((i) => (imageUrls.length === 0 ? 0 : (i + 1) % imageUrls.length));
  };

  const handleSave = async () => {
    const materialsString = materialItems.filter((m) => m.trim()).join("\n");
    const descriptionFromEditor = descriptionEditorRef.current
      ? descriptionEditorRef.current.innerHTML
      : String(form.description || "");
    const normalizedDescription = normalizeDescriptionHtml(descriptionFromEditor);

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

    if (!validateSaleFields()) return;

    if (mode === "create") {
      const name = (form.name || "").trim();
      if (!name) {
        toast({ title: "Falta el nombre", description: "Indica un nombre para el producto.", variant: "destructive" });
        return;
      }
      const categoryTrim = (form.category || "").trim();
      if (!categoryTrim) {
        toast({
          title: "Falta la etiqueta de tipo",
          description: "Indica el texto pequeño dorado (por ejemplo «Espuma»); con él se genera la URL del producto.",
          variant: "destructive",
        });
        return;
      }
      const slugFinal = productSlugFromForm(form.category, name);
      let conflicting: { id: string; name: string } | null;
      try {
        conflicting = await fetchConflictingProductBySlug(slugFinal);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error desconocido";
        toast({ title: "No se pudo comprobar la URL", description: message, variant: "destructive" });
        return;
      }
      if (conflicting) {
        setSlugConflict({ slug: slugFinal, otherProductName: conflicting.name });
        toast({
          title: "URL duplicada",
          description: `La ruta /${slugFinal} ya está en uso por «${conflicting.name}». Cambia la etiqueta dorada o el nombre.`,
          variant: "destructive",
        });
        return;
      }
      setSaving(true);
      const { data: createdRows, error } = await (supabase as any)
        .from("products")
        .insert({
          name,
          slug: slugFinal,
          category: categoryTrim,
          tagline: form.tagline || "",
          description: normalizedDescription || null,
          materials: materialsString || null,
          materials_label: (form as any).materials_label || "materiales",
          shipping_info: form.shipping_info || "",
          price: Number(form.price) || 0,
          stock: Number(form.stock) || 0,
          image_url: serializeProductImages(imageUrls),
          is_pack: Boolean(form.is_pack),
          ...salePayload(),
          color_variants: colorVariantsPayload,
        })
        .select("id");

      if (error) {
        toast({ title: "Error al crear", description: error.message, variant: "destructive" });
      } else if (!createdRows?.length) {
        toast({
          title: "No se pudo crear",
          description: "El producto no se guardó en la base de datos. Comprueba que tu usuario tiene rol de administrador.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Producto creado correctamente" });
        onSaved();
        onOpenChange(false);
      }
      setSaving(false);
      return;
    }

    if (!currentProduct) return;
    const categoryTrim = (form.category || "").trim() || "otros";
    const slugFinal = productSlugFromForm(form.category, form.name);
    let conflictingEdit: { id: string; name: string } | null;
    try {
      conflictingEdit = await fetchConflictingProductBySlug(slugFinal, currentProduct.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      toast({ title: "No se pudo comprobar la URL", description: message, variant: "destructive" });
      return;
    }
    if (conflictingEdit) {
      setSlugConflict({ slug: slugFinal, otherProductName: conflictingEdit.name });
      toast({
        title: "URL duplicada",
        description: `La ruta /${slugFinal} ya está en uso por «${conflictingEdit.name}». Cambia la etiqueta dorada o el nombre.`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("products")
      .update({
        name: form.name,
        category: categoryTrim,
        slug: slugFinal,
        tagline: form.tagline || "",
        description: normalizedDescription,
        materials: materialsString,
        materials_label: (form as any).materials_label || "materiales",
        shipping_info: form.shipping_info || "",
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        image_url: serializeProductImages(imageUrls),
        is_pack: Boolean(form.is_pack),
        ...salePayload(),
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

  const galleryPreview =
    imageUrls.length > 0
      ? imageUrls[Math.min(previewIndex, imageUrls.length - 1)]
      : null;
  const displayImage =
    galleryPreview ||
    (currentProduct
      ? getProductImageUrl(currentProduct.image_url, currentProduct.slug)
      : getProductImageUrl(form.image_url, productSlugFromForm(form.category, form.name)));
  const canAddMaterial = materialItems.length === 0 || (materialItems[materialItems.length - 1]?.trim() ?? "") !== "";
  const canNavigateGallery = imageUrls.length > 1;

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
    <>
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
                relative mx-auto aspect-square w-full max-w-sm cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden bg-muted
                ${isDragging ? "border-gold bg-gold/5 scale-[1.01]" : "border-gold/20 hover:border-gold/40"}
                ${displayImage ? "" : "flex items-center justify-center"}
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
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-carbon/40">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-sm">Arrastra una o varias imágenes, o haz clic</span>
                </div>
              )}
              {galleryPreview && !uploading && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 z-20 h-9 w-9 rounded-full bg-white/90 text-carbon shadow-md hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCropOpen(true);
                  }}
                  aria-label="Recortar imagen"
                  title="Recortar imagen"
                >
                  <Crop className="h-4 w-4" />
                </Button>
              )}
              {canNavigateGallery && !uploading && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full bg-white/90 text-carbon shadow-md hover:bg-white"
                    onClick={showPrevImage}
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full bg-white/90 text-carbon shadow-md hover:bg-white"
                    onClick={showNextImage}
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <span className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-carbon/60 px-2.5 py-0.5 text-xs text-white pointer-events-none">
                    {Math.min(previewIndex, imageUrls.length - 1) + 1} / {imageUrls.length}
                  </span>
                </>
              )}
              {displayImage && !uploading && (
                <div className="absolute inset-0 bg-carbon/0 hover:bg-carbon/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                  <div className="flex items-center gap-2 text-white bg-carbon/60 rounded-lg px-4 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    Añadir más imágenes
                  </div>
                </div>
              )}
            </div>
            {imageUrls.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-carbon/45">Arrastra las miniaturas para cambiar el orden. La primera es la principal.</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {imageUrls.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(index));
                        setThumbDragIndex(index);
                      }}
                      onDragEnd={() => {
                        setThumbDragIndex(null);
                        setThumbDragOverIndex(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (thumbDragOverIndex !== index) setThumbDragOverIndex(index);
                      }}
                      onDragLeave={() => {
                        if (thumbDragOverIndex === index) setThumbDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fromRaw = e.dataTransfer.getData("text/plain");
                        const fromIndex = Number.parseInt(fromRaw, 10);
                        setThumbDragIndex(null);
                        setThumbDragOverIndex(null);
                        if (!Number.isFinite(fromIndex)) return;
                        reorderImage(fromIndex, index);
                      }}
                      onClick={() => setPreviewIndex(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPreviewIndex(index);
                        }
                      }}
                      className={cn(
                        "relative group aspect-square rounded-lg overflow-hidden border bg-muted cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 transition-opacity",
                        index === previewIndex ? "border-gold ring-2 ring-gold/40" : "border-gold/20",
                        thumbDragIndex === index && "opacity-40",
                        thumbDragOverIndex === index && thumbDragIndex !== index && "ring-2 ring-gold border-gold",
                      )}
                    >
                      <img
                        src={url}
                        alt={`Imagen ${index + 1}`}
                        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                        draggable={false}
                      />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 text-[10px] bg-gold text-white px-1.5 py-0.5 rounded pointer-events-none">
                          Principal
                        </span>
                      )}
                      <div className="absolute inset-0 bg-carbon/0 group-hover:bg-carbon/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImageAt(index);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
              <Label htmlFor="category" className="text-carbon/70 text-xs uppercase tracking-wider">
                Etiqueta dorada (tipo)
              </Label>
              <Input
                id="category"
                value={form.category || ""}
                onChange={(e) => {
                  setSlugConflict(null);
                  updateField("category", e.target.value);
                }}
                onBlur={() => void verifySlugOnBlur()}
                placeholder="Ej. Espuma, Pinzas…"
                className={cn(
                  "mt-1 bg-white border-gold/15",
                  slugConflict && "border-destructive focus-visible:ring-destructive/30"
                )}
                aria-invalid={slugConflict ? true : undefined}
                aria-describedby={
                  slugConflict ? "slug-conflict-msg" : slugChecking ? "slug-checking-msg" : undefined
                }
              />
              {slugChecking ? (
                <p id="slug-checking-msg" className="text-xs text-carbon/50 mt-1">
                  Comprobando si la ruta está libre…
                </p>
              ) : null}
              {slugConflict ? (
                <p id="slug-conflict-msg" role="alert" className="text-sm text-destructive mt-2 font-medium">
                  La ruta <span className="font-mono">/{slugConflict.slug}</span> ya está en uso por el producto «
                  {slugConflict.otherProductName}». Cambia la etiqueta o el nombre y vuelve a comprobar al salir del
                  campo.
                </p>
              ) : null}
              <p className="text-xs text-carbon/45 mt-1.5 leading-snug">
                Texto pequeño en dorado sobre la ficha. Al guardar, la ruta del producto será{" "}
                <span className="font-mono text-carbon/70">/{productSlugFromForm(form.category, form.name)}</span>
                {mode === "edit" && currentProduct && slugPreviewDiffersFromStored(currentProduct.slug, form.category, form.name) ? (
                  <span className="block mt-1 text-amber-800/90">
                    La URL cambiará respecto a la actual (/{currentProduct.slug}). Los enlaces antiguos dejarán de funcionar.
                  </span>
                ) : null}
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="name" className="text-carbon/70 text-xs uppercase tracking-wider">
                Nombre
              </Label>
              <Input
                id="name"
                value={form.name || ""}
                onChange={(e) => {
                  setSlugConflict(null);
                  updateField("name", e.target.value);
                }}
                onBlur={() => void verifySlugOnBlur()}
                className={cn(
                  "mt-1 bg-white border-gold/15",
                  slugConflict && "border-destructive focus-visible:ring-destructive/30"
                )}
                aria-invalid={slugConflict ? true : undefined}
                aria-describedby={slugConflict ? "slug-conflict-msg" : undefined}
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
                  key={`${mode}-${currentProduct?.id ?? "new"}`}
                  id="description"
                  ref={setDescriptionEditorNode}
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
              <div className={`flex items-center mb-2 ${form.is_pack ? "" : "justify-between"}`}>
                <Label className="text-carbon/70 text-xs uppercase tracking-wider">
                  {form.is_pack
                    ? '¿Qué incluye este pack?'
                    : isComposicion
                      ? 'Composición'
                      : 'Materiales'}
                </Label>
                {!form.is_pack ? (
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
                ) : null}
              </div>

              <div className="space-y-2">
                {materialItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gold/60 text-xs shrink-0 w-5 text-center">✦</span>
                    <Input
                      value={item}
                      onChange={(e) => handleMaterialChange(index, e.target.value)}
                      placeholder={
                        form.is_pack
                          ? `Ítem ${index + 1}`
                          : isComposicion
                            ? `Ingrediente ${index + 1}`
                            : `Material ${index + 1}`
                      }
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
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gold/15 bg-white/60 px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="is_on_sale" className="text-carbon/70 text-xs uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Tag size={14} className="text-red-500 -rotate-12" aria-hidden />
                  En oferta
                </Label>
                <p id="is_on_sale-hint" className="text-xs text-carbon/45 mt-1 leading-snug">
                  Muestra el precio habitual tachado y el precio rebajado en la tienda.
                </p>
              </div>
              <Switch
                id="is_on_sale"
                checked={Boolean(form.is_on_sale)}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    is_on_sale: checked,
                    sale_price: checked ? prev.sale_price ?? null : null,
                  }))
                }
                className="shrink-0 data-[state=checked]:bg-red-500"
                aria-describedby="is_on_sale-hint"
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
            {form.is_on_sale ? (
              <div>
                <Label htmlFor="sale_price" className="text-carbon/70 text-xs uppercase tracking-wider">
                  Precio de oferta (€)
                </Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.sale_price ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    updateField("sale_price", raw === "" ? null : parseFloat(raw) || 0);
                  }}
                  className="mt-1 bg-white border-gold/15 border-red-200/60 focus-visible:ring-red-300/40"
                  placeholder="Ej. 19.99"
                />
              </div>
            ) : null}
            <div className={form.is_on_sale ? "sm:col-span-2" : undefined}>
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
            disabled={!isDirty || saving || !!slugConflict || slugChecking}
            className="w-full bg-gold hover:bg-gold/90 text-white h-11 text-sm font-medium disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "create" ? "Crear producto" : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <ProductImageCropDialog
      open={cropOpen}
      imageSrc={galleryPreview}
      onOpenChange={setCropOpen}
      onCropped={async (file) => {
        const index = Math.min(previewIndex, Math.max(0, imageUrls.length - 1));
        await replaceImageAtIndex(index, file);
      }}
    />
    </>
  );
};

export default ProductEditDialog;
