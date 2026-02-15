import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import AnimatedSection from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
};

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [togglingTestimonial, setTogglingTestimonial] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      const [ordersRes, productsRes, testimonialsRes] = await Promise.all([
        (supabase as any).from("orders").select("*").order("created_at", { ascending: false }).limit(20),
        (supabase as any).from("products").select("*").order("name"),
        (supabase as any).from("testimonials").select("*, profiles:user_id(full_name)").order("created_at", { ascending: false }),
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      setTestimonials(testimonialsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [isAdmin]);

  if (authLoading) return <main className="min-h-screen bg-cream pt-32 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></main>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const updateProduct = async (id: string, field: string, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: field === "price" ? parseFloat(value) || 0 : parseInt(value) || 0 } : p))
    );
  };

  const saveProduct = async (product: any) => {
    setSaving(product.id);
    const { error } = await (supabase as any)
      .from("products")
      .update({ price: product.price, stock: product.stock })
      .eq("id", product.id);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Producto actualizado" });
    }
    setSaving(null);
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
          <div className="space-y-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-carbon">{p.name}</h3>
                  <p className="text-xs text-carbon/40">{p.category}</p>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-carbon/50">Precio €</span>
                    <Input
                      type="number"
                      value={p.price}
                      onChange={(e) => updateProduct(p.id, "price", e.target.value)}
                      className="w-24 bg-cream/50 border-gold/15 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-carbon/50">Stock</span>
                    <Input
                      type="number"
                      value={p.stock}
                      onChange={(e) => updateProduct(p.id, "stock", e.target.value)}
                      className="w-20 bg-cream/50 border-gold/15 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving === p.id}
                    onClick={() => saveProduct(p)}
                    className="border-gold/20 text-gold hover:bg-gold/5"
                  >
                    {saving === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

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
                        {t.profiles?.full_name || "Anónimo"}
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
