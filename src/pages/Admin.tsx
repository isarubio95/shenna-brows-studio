import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import AnimatedSection from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Printer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ProductEditDialog from "@/components/admin/ProductEditDialog";
import AdminContentEditor from "@/components/admin/AdminContentEditor";
import AdminEmailSender from "@/components/admin/AdminEmailSender";
import AdminThemeEditor from "@/components/admin/AdminThemeEditor";
import { getProductImageUrl } from "@/lib/product-images";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
};

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingTestimonial, setTogglingTestimonial] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printingLabelOrderId, setPrintingLabelOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      const [ordersRes, productsRes, testimonialsRes] = await Promise.all([
        (supabase as any).from("orders").select("*").order("created_at", { ascending: false }).limit(20),
        (supabase as any).from("products").select("*").order("name"),
        (supabase as any).from("testimonials").select("*").order("created_at", { ascending: false }),
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      // Enrich testimonials with profile names
      const rawTestimonials = testimonialsRes.data || [];
      if (rawTestimonials.length > 0) {
        const userIds = rawTestimonials.map((t: any) => t.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
        setTestimonials(rawTestimonials.map((t: any) => ({ ...t, author_name: profileMap.get(t.user_id) || "Anónimo" })));
      } else {
        setTestimonials([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [isAdmin]);

  if (authLoading) return <main className="min-h-screen bg-cream pt-32 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></main>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const refreshProducts = async () => {
    const { data } = await (supabase as any).from("products").select("*").order("name");
    setProducts(data || []);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    setTogglingTestimonial(id);
    const { error } = await (supabase as any)
      .from("testimonials")
      .update({ is_featured: !current })
      .eq("id", id);
    if (!error) {
      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_featured: !current } : t))
      );
    }
    setTogglingTestimonial(null);
  };

  const openAndPrint = (url: string) => {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) {
      throw new Error("No se pudo abrir la etiqueta. Revisa si el navegador bloquea ventanas emergentes.");
    }
    popup.addEventListener("load", () => popup.print(), { once: true });
  };

  const printBase64Pdf = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    openAndPrint(url);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const extractAndPrintLabel = (payload: unknown) => {
    if (!payload) {
      throw new Error("Correos no devolvió contenido para la etiqueta.");
    }

    if (typeof payload === "string") {
      if (payload.startsWith("http://") || payload.startsWith("https://")) {
        openAndPrint(payload);
        return;
      }

      // Compatibilidad: algunos servicios devuelven PDF en base64 en texto plano.
      if (payload.length > 100) {
        printBase64Pdf(payload);
        return;
      }
    }

    if (typeof payload === "object") {
      const data = payload as Record<string, unknown>;
      const maybeUrl = (data.label_url || data.labelUrl || data.pdf_url || data.pdfUrl || data.url) as string | undefined;
      if (maybeUrl && typeof maybeUrl === "string") {
        openAndPrint(maybeUrl);
        return;
      }

      const maybeBase64 = (data.label_base64 || data.labelBase64 || data.pdf_base64 || data.pdfBase64) as string | undefined;
      if (maybeBase64 && typeof maybeBase64 === "string") {
        printBase64Pdf(maybeBase64);
        return;
      }
    }

    throw new Error("Respuesta de etiqueta no compatible. Revisa el formato que devuelve tu endpoint de Correos.");
  };

  const handlePrintLabel = async (order: any) => {
    setPrintingLabelOrderId(order.id);
    try {
      const endpoint = (import.meta.env.VITE_CORREOS_LABELS_ENDPOINT as string | undefined)?.trim() || "";
      const body = {
        orderId: order.id,
        email: order.email,
        shippingAddress: order.shipping_address ?? null,
      };

      const { data, error } = await supabase.functions.invoke("correos-api", {
        body: {
          service: "labels",
          endpoint,
          method: "POST",
          body,
        },
      });

      if (error) throw error;
      extractAndPrintLabel(data);
      toast({ title: "Etiqueta preparada", description: "Se abrió la etiqueta para imprimir." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al generar la etiqueta";
      toast({
        title: "No se pudo imprimir la etiqueta",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPrintingLabelOrderId(null);
    }
  };

  return (
    <main className="min-h-screen bg-cream pt-28 pb-16">
      <div className="container mx-auto px-6 max-w-5xl">
        <AnimatedSection>
          <h1 className="font-playfair text-3xl font-bold text-carbon mb-2">Panel de Administración</h1>
          <p className="text-carbon/50 text-sm mb-10">Gestiona productos y pedidos.</p>
        </AnimatedSection>

        {/* Orders */}
        <AnimatedSection delay={0.05}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Pedidos Recientes</h2>
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden mb-12">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-carbon/40">No hay pedidos aún</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gold/10">
                    <TableHead className="text-carbon/60">ID</TableHead>
                    <TableHead className="text-carbon/60">Email</TableHead>
                    <TableHead className="text-carbon/60">Total</TableHead>
                    <TableHead className="text-carbon/60">Estado</TableHead>
                    <TableHead className="text-carbon/60">Fecha</TableHead>
                    <TableHead className="text-carbon/60 text-right">Etiqueta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} className="border-b border-gold/5">
                      <TableCell className="font-mono text-xs text-carbon/70">{o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-carbon text-sm">{o.email}</TableCell>
                      <TableCell className="text-carbon font-medium">€{Number(o.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[o.status] || "bg-gray-100 text-gray-700"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-carbon/60 text-sm">{new Date(o.created_at).toLocaleDateString("es-ES")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintLabel(o)}
                          disabled={printingLabelOrderId === o.id}
                          className="border-gold/20 text-gold hover:bg-gold/5"
                        >
                          {printingLabelOrderId === o.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Printer className="h-4 w-4 mr-1.5" />
                              Imprimir
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </AnimatedSection>

        {/* Products */}
        <AnimatedSection delay={0.1}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Editar Productos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden group">
                <div className="aspect-square bg-muted overflow-hidden">
                  <img src={getProductImageUrl(p.image_url, p.slug)} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-carbon">{p.name}</h3>
                  <p className="text-xs text-carbon/40 mb-1">{p.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-carbon font-semibold">€{Number(p.price).toFixed(2)}</span>
                    <span className="text-xs text-carbon/50">Stock: {p.stock}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(p)}
                    className="w-full mt-3 border-gold/20 text-gold hover:bg-gold/5"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <ProductEditDialog
          product={editingProduct}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSaved={refreshProducts}
        />

        <div className="mb-12" />

        {/* Newsletter Sender */}
        <AnimatedSection delay={0.13}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Newsletter</h2>
          <p className="text-carbon/40 text-sm mb-4">Envía campañas solo a suscriptores con consentimiento activo.</p>
          <AdminEmailSender />
        </AnimatedSection>

        <div className="mb-12" />
        <AnimatedSection delay={0.12}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Contenido de la Web</h2>
          <p className="text-carbon/40 text-sm mb-4">Edita los textos del inicio y la página "Sobre mí".</p>
          <AdminContentEditor />
        </AnimatedSection>

        <div className="mb-12" />
        <AnimatedSection delay={0.14}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Personalización del Tema</h2>
          <p className="text-carbon/40 text-sm mb-4">Cambia los colores de fondo de las secciones, del footer y de la tipografía.</p>
          <AdminThemeEditor />
        </AnimatedSection>

        <div className="mb-12" />

        {/* Testimonials Management */}
        <AnimatedSection delay={0.15}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Gestión de Testimonios</h2>
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            {testimonials.length === 0 ? (
              <div className="p-8 text-center text-carbon/40">No hay testimonios aún</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gold/10">
                    <TableHead className="text-carbon/60">Cliente</TableHead>
                    <TableHead className="text-carbon/60">Comentario</TableHead>
                    <TableHead className="text-carbon/60">Fecha</TableHead>
                    <TableHead className="text-carbon/60 text-center">Destacado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((t) => (
                    <TableRow key={t.id} className="border-b border-gold/5">
                      <TableCell className="text-carbon text-sm font-medium">
                        {t.author_name || "Anónimo"}
                      </TableCell>
                      <TableCell className="text-carbon/70 text-sm max-w-xs truncate">
                        {t.content}
                      </TableCell>
                      <TableCell className="text-carbon/60 text-sm">
                        {new Date(t.created_at).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={t.is_featured}
                          onCheckedChange={() => toggleFeatured(t.id, t.is_featured)}
                          disabled={togglingTestimonial === t.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </AnimatedSection>
      </div>
    </main>
  );
};

export default Admin;
