import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Eye, RotateCcw, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pagado", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  shipped: { label: "Enviado", variant: "outline" },
  delivered: { label: "Entregado", variant: "default" },
};

const MONTHS = [
  { value: "all", label: "Todos los meses" },
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" }, { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" }, { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" }, { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" }, { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

const Account = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("defective");
  const [returnNote, setReturnNote] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const availableYears = useMemo(() => {
    const years = new Set(orders.map((o) => new Date(o.created_at!).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.created_at!);
      if (filterMonth !== "all" && d.getMonth() + 1 !== parseInt(filterMonth)) return false;
      if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
      return true;
    });
  }, [orders, filterMonth, filterYear]);

  const fetchOrderDetails = async (orderId: string) => {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
    if (error) throw error;

    const order = orders.find((o) => o.id === orderId);
    setSelectedOrder({ ...order, items: data });
    setSheetOpen(true);
  };

  const returnMutation = useMutation({
    mutationFn: async () => {
      // For now, simulate saving a return request
      await new Promise((r) => setTimeout(r, 800));
    },
    onSuccess: () => {
      toast({ title: "Solicitud recibida", description: "Nos pondremos en contacto contigo pronto." });
      setReturnDialogOpen(false);
      setReturnNote("");
    },
  });

  if (authLoading) {
    return (
      <main className="min-h-screen bg-background pt-32 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const firstName = profile?.full_name?.split(" ")[0] || "Cliente";

  return (
    <main className="min-h-screen bg-background pt-28 pb-16">
      <div className="container mx-auto px-6 max-w-5xl">
        <AnimatedSection>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-2">
            Mi Cuenta
          </h1>
          <p className="text-muted-foreground mb-10">
            Bienvenida, <span className="text-primary font-medium">{firstName}</span>
          </p>
        </AnimatedSection>

        {/* Filters */}
        <AnimatedSection delay={0.05}>
          <div className="flex flex-wrap gap-3 mb-6">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[160px] bg-card border-border">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[120px] bg-card border-border">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AnimatedSection>

        {/* Orders Table */}
        <AnimatedSection delay={0.1}>
          <div className="bg-card rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package size={40} className="mb-3 opacity-40" />
                <p>No tienes pedidos aún</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const cfg = statusConfig[order.status] || { label: order.status, variant: "outline" as const };
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {order.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(order.created_at!).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className={
                            order.status === "paid" || order.status === "delivered"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : order.status === "pending"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : order.status === "shipped"
                              ? "bg-sky-100 text-sky-700 border-sky-200"
                              : ""
                          }>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{(order.total ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => fetchOrderDetails(order.id)}
                              title="Ver detalles"
                            >
                              <Eye size={16} />
                            </Button>
                            {(order.status === "delivered") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setReturnOrderId(order.id);
                                  setReturnDialogOpen(true);
                                }}
                                title="Devolver"
                              >
                                <RotateCcw size={16} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </AnimatedSection>
      </div>

      {/* Order Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-playfair">Detalle del Pedido</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">ID</p>
                <p className="font-mono text-sm">{selectedOrder.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Productos</p>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">€{(item.unit_price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {selectedOrder.shipping_address && Object.keys(selectedOrder.shipping_address).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Dirección de envío</p>
                  <p className="text-sm">
                    {typeof selectedOrder.shipping_address === "object"
                      ? Object.values(selectedOrder.shipping_address).filter(Boolean).join(", ")
                      : String(selectedOrder.shipping_address)}
                  </p>
                </div>
              )}
              <div className="border-t border-border pt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>€{(selectedOrder.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío</span>
                  <span>€{(selectedOrder.shipping ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="font-playfair text-lg">€{(selectedOrder.total ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-playfair">Solicitar Devolución</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-muted-foreground">Motivo</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wrong_size">Talla incorrecta</SelectItem>
                  <SelectItem value="defective">Defectuoso</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Comentarios (opcional)</Label>
              <Textarea
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="Cuéntanos más detalles…"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {returnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Account;
