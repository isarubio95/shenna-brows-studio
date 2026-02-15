import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon } from "lucide-react";
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

const ProductEditDialog = ({ product, open, onOpenChange, onSaved }: ProductEditDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Product>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync form when product changes
  const currentProduct = product;
  const [lastProductId, setLastProductId] = useState<string | null>(null);
  if (currentProduct && currentProduct.id !== lastProductId) {
    setForm({
      name: currentProduct.name,
      tagline: currentProduct.tagline,
      description: currentProduct.description,
      materials: currentProduct.materials,
      shipping_info: currentProduct.shipping_info,
      price: currentProduct.price,
      stock: currentProduct.stock,
      image_url: currentProduct.image_url,
    });
    setPreviewUrl(null);
    setLastProductId(currentProduct.id);
  }

  const updateField = (field: keyof Product, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    const { error } = await (supabase as any)
      .from("products")
      .update({
        name: form.name,
        tagline: form.tagline || "",
        description: form.description || "",
        materials: form.materials || "",
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

  const displayImage = previewUrl || form.image_url || currentProduct?.image_url;

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
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-1 bg-white border-gold/15 min-h-[100px]"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="materials" className="text-carbon/70 text-xs uppercase tracking-wider">
                Materiales
              </Label>
              <Textarea
                id="materials"
                value={form.materials || ""}
                onChange={(e) => updateField("materials", e.target.value)}
                className="mt-1 bg-white border-gold/15"
              />
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
