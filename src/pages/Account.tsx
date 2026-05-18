import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Eye, RotateCcw, Package, MessageSquareQuote, CheckCircle2, X, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  RETURN_REASON_LABELS,
  canRequestReturn,
  canCancelOrder,
  getOrderReturnDisplay,
  type ReturnReason,
  type ReturnRequestStatus,
} from "@/lib/returns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pagado", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  pending_payment: { label: "Pago en curso", variant: "secondary" },
  shipped: { label: "Enviado", variant: "outline" },
  delivered: { label: "Entregado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const MONTHS = [
  { value: "all", label: "Todos los meses" },
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" }, { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" }, { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" }, { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" }, { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

type ReturnRequestRow = {
  id: string;
  order_id: string;
  status: ReturnRequestStatus;
  reason: string;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type OrderWithItems = {
  id: string;
  created_at: string | null;
  status: string;
  refund_status: string;
  returned: boolean;
  total: number | null;
  subtotal: number | null;
  shipping: number | null;
  shipping_address: unknown;
  order_items: OrderItemRow[];
};

const Account = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<ReturnReason>("defective");
  const [returnNote, setReturnNote] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [testimonialText, setTestimonialText] = useState("");
  const [testimonialCooldownUntil, setTestimonialCooldownUntil] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(id, product_name, quantity, unit_price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderWithItems[];
    },
    enabled: !!user,
  });

  const { data: returnRequests = [] } = useQuery({
    queryKey: ["my-return-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("return_requests")
        .select("id, order_id, status, reason, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReturnRequestRow[];
    },
    enabled: !!user,
  });

  const returnByOrderId = useMemo(() => {
    const map = new Map<string, ReturnRequestRow>();
    for (const r of returnRequests) {
      if (!map.has(r.order_id)) map.set(r.order_id, r);
    }
    return map;
  }, [returnRequests]);

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
      if (!returnOrderId) throw new Error("Pedido no seleccionado");
      const { data, error } = await supabase.functions.invoke("submit-return-request", {
        body: {
          orderId: returnOrderId,
          reason: returnReason,
          customerNote: returnNote.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({
        title: "Solicitud recibida",
        description: "Revisaremos tu petición y te avisaremos por correo.",
      });
      setReturnDialogOpen(false);
      setReturnNote("");
      setReturnOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["my-return-requests"] });
    },
    onError: (err: Error) => {
      toast({
        title: "No se pudo enviar la solicitud",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const cancelReturnMutation = useMutation({
    mutationFn: async (returnRequestId: string) => {
      const { error } = await (supabase as any)
        .from("return_requests")
        .update({ status: "cancelled" })
        .eq("id", returnRequestId)
        .eq("status", "requested");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Solicitud cancelada" });
      queryClient.invalidateQueries({ queryKey: ["my-return-requests"] });
    },
    onError: () => {
      toast({ title: "No se pudo cancelar", variant: "destructive" });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      if (!returnOrderId) throw new Error("Pedido no seleccionado");
      const { data, error } = await supabase.functions.invoke("cancel-order", {
        body: {
          orderId: returnOrderId,
          customerNote: cancelNote.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({
        title: "Pedido cancelado",
        description: "Te hemos enviado un correo de confirmación. El reembolso se tramitará en breve.",
      });
      setCancelDialogOpen(false);
      setCancelNote("");
      setReturnOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (err: Error) => {
      toast({
        title: "No se pudo cancelar el pedido",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const { data: myTestimonial } = useQuery({
    queryKey: ["my-testimonial", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("testimonials")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const testimonialMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await (supabase as any)
        .from("testimonials")
        .insert({ user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "¡Gracias por compartir tu experiencia!", description: "Tu comentario será revisado por nuestro equipo." });
      setTestimonialText("");
      setTestimonialCooldownUntil(Date.now() + 120000);
      queryClient.invalidateQueries({ queryKey: ["my-testimonial"] });
    },
    onError: () => {
      toast({ title: "Error al enviar", description: "Inténtalo de nuevo.", variant: "destructive" });
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
  const testimonialCooldownMs = testimonialCooldownUntil
    ? Math.max(0, testimonialCooldownUntil - Date.now())
    : 0;
  const testimonialCooldownActive = testimonialCooldownMs > 0;

  const openReturnDialog = (orderId: string) => {
    setReturnOrderId(orderId);
    setReturnReason("defective");
    setReturnNote("");
    setReturnDialogOpen(true);
  };

  const openCancelDialog = (orderId: string) => {
    setReturnOrderId(orderId);
    setCancelNote("");
    setCancelDialogOpen(true);
  };

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
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const cfg = statusConfig[order.status] || { label: order.status, variant: "outline" as const };
                    const returnReq = returnByOrderId.get(order.id);
                    const refundStatus = order.refund_status ?? "none";
                    const canReturn =
                      canRequestReturn(order.status, refundStatus, order.returned) && !returnReq;
                    const canCancel = canCancelOrder(order.status, refundStatus) && !returnReq;
                    return (
                      <TableRow key={order.id}>
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
                            {canCancel ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openCancelDialog(order.id)}
                                title="Cancelar pedido"
                              >
                                <Ban size={16} />
                              </Button>
                            ) : null}
                            {canReturn ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openReturnDialog(order.id)}
                                title="Solicitar devolución"
                              >
                                <RotateCcw size={16} />
                              </Button>
                            ) : null}
                            {returnReq?.status === "requested" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => cancelReturnMutation.mutate(returnReq.id)}
                                disabled={cancelReturnMutation.isPending}
                                title="Cancelar solicitud"
                              >
                                <X size={16} />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Puedes cancelar el pedido mientras no esté enviado. Tras el envío, solo podrás solicitar devolución según la{" "}
            <a href="/politica-devoluciones" className="text-primary underline">
              política de devoluciones
            </a>
            .
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <div id="tu-experiencia" className="bg-card rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-8 mt-10 scroll-mt-28">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquareQuote size={22} className="text-primary" />
              <h2 className="font-playfair text-xl font-semibold text-foreground">Tu experiencia Shenna</h2>
            </div>

            {myTestimonial ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{myTestimonial.content}"
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={14} className={myTestimonial.is_featured ? "text-emerald-500" : "text-muted-foreground"} />
                  <span>{myTestimonial.is_featured ? "Publicado" : "Pendiente de aprobación"}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cuéntanos cómo ha sido tu experiencia con nuestras herramientas. Tu opinión nos ayuda a crecer.
                </p>
                <Textarea
                  value={testimonialText}
                  onChange={(e) => setTestimonialText(e.target.value)}
                  placeholder="Comparte tu experiencia con Shenna Brows…"
                  className="min-h-[100px] bg-background border-border resize-none"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{testimonialText.length}/500</span>
                  <Button
                    variant="outline"
                    onClick={() => testimonialMutation.mutate(testimonialText)}
                    disabled={testimonialText.trim().length < 10 || testimonialMutation.isPending || testimonialCooldownActive}
                    className="border-primary/30 text-primary hover:bg-primary/5"
                  >
                    {testimonialMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enviar Opinión
                  </Button>
                </div>
                {testimonialCooldownActive ? (
                  <p className="text-xs text-muted-foreground">
                    Espera {Math.ceil(testimonialCooldownMs / 1000)}s antes de enviar otra opinión.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>

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
              {(() => {
                const sheetReturn = returnByOrderId.get(selectedOrder.id);
                const sheetReturnDisplay = getOrderReturnDisplay(
                  selectedOrder,
                  sheetReturn ? { status: sheetReturn.status } : null,
                );
                if (!sheetReturnDisplay) return null;
                return (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Devolución</p>
                    <p className="text-sm font-medium">{sheetReturnDisplay.label}</p>
                  </div>
                );
              })()}
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

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-playfair">Cancelar pedido</DialogTitle>
            <DialogDescription>
              Tu pedido aún no ha sido enviado. Al cancelar, tramitaremos el reembolso del importe pagado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-muted-foreground">Motivo (opcional)</Label>
              <Textarea
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Cuéntanos por qué cancelas…"
                className="mt-1"
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Volver</Button>
            <Button
              variant="destructive"
              onClick={() => cancelOrderMutation.mutate()}
              disabled={cancelOrderMutation.isPending}
            >
              {cancelOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-playfair">Solicitar devolución</DialogTitle>
            <DialogDescription>
              Tienes 14 días desde la recepción para desistir. Revisaremos tu solicitud antes de indicarte cómo
              enviar el producto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-muted-foreground">Motivo</Label>
              <Select value={returnReason} onValueChange={(v) => setReturnReason(v as ReturnReason)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RETURN_REASON_LABELS) as ReturnReason[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {RETURN_REASON_LABELS[key]}
                    </SelectItem>
                  ))}
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
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending}
              className="bg-primary text-primary-foreground mb-3"
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
