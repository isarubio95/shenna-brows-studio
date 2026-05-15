import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  getRedsysCanalesUrl,
  type ReturnRequestStatus,
} from "@/lib/returns";

type ReturnRow = {
  id: string;
  order_id: string;
  reason: string;
  customer_note: string | null;
  status: ReturnRequestStatus;
  admin_note: string | null;
  requested_amount: number | null;
  refunded_amount: number | null;
  refunded_at: string | null;
  created_at: string;
  orders: {
    email: string;
    total: number | null;
    stripe_session_id: string | null;
    status: string;
    refund_status: string | null;
    redsys_auth_code: string | null;
  } | null;
};

type FilterTab = "pending" | "active" | "closed";

const statusBadgeClass: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
  product_received: "bg-violet-100 text-violet-800",
  refunded: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const AdminReturnsManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("return_requests")
      .select(
        "id, order_id, reason, customer_note, status, admin_note, requested_amount, refunded_amount, refunded_at, created_at, orders ( email, total, stripe_session_id, status, refund_status, redsys_auth_code )",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "Error al cargar devoluciones", description: error.message, variant: "destructive" });
    } else {
      setRows((data as ReturnRow[]) ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "pending") return r.status === "requested";
      if (filter === "active") return r.status === "approved" || r.status === "product_received";
      return ["refunded", "rejected", "cancelled"].includes(r.status);
    });
  }, [rows, filter]);

  const runAction = async (
    returnRequestId: string,
    action: "approve" | "reject" | "product_received" | "refund",
    extra?: { refundedAmount?: number },
  ) => {
    setBusyId(returnRequestId);
    const { data, error } = await supabase.functions.invoke("manage-return-request", {
      body: {
        returnRequestId,
        action,
        adminNote: adminNotes[returnRequestId]?.trim() || undefined,
        refundedAmount: extra?.refundedAmount,
      },
    });
    if (error || data?.error) {
      toast({
        title: "No se pudo actualizar",
        description: data?.error || error?.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Solicitud actualizada", description: RETURN_STATUS_LABELS[data.status as ReturnRequestStatus] });
      await load();
    }
    setBusyId(null);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copiado` });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  const canalesUrl = getRedsysCanalesUrl();

  return (
    <div className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="font-playfair text-xl font-semibold text-carbon">Devoluciones</h2>
          <p className="text-carbon/40 text-sm mt-1">
            Gestiona solicitudes de clientes. El reembolso bancario se hace en{" "}
            <a href={canalesUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">
              Redsys Canales
            </a>{" "}
            (irreversible).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ["pending", "Pendientes"],
              ["active", "En curso"],
              ["closed", "Cerradas"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? "default" : "outline"}
              className={filter === key ? "bg-gold hover:bg-gold/90 text-white" : "border-gold/20"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-carbon/40 text-sm">No hay solicitudes en esta categoría</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gold/10">
                  <TableHead className="text-carbon/60">Pedido</TableHead>
                  <TableHead className="text-carbon/60">Cliente</TableHead>
                  <TableHead className="text-carbon/60">Motivo</TableHead>
                  <TableHead className="text-carbon/60">Estado</TableHead>
                  <TableHead className="text-carbon/60">Redsys</TableHead>
                  <TableHead className="text-carbon/60 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const order = r.orders;
                  const redsys = order?.stripe_session_id?.trim() || "";
                  const isBusy = busyId === r.id;
                  const defaultRefund = String(r.requested_amount ?? order?.total ?? "");

                  return (
                    <TableRow key={r.id} className="border-b border-gold/5 align-top">
                      <TableCell className="font-mono text-xs text-carbon/70">
                        <div>{r.order_id.slice(0, 8)}…</div>
                        <div className="text-carbon/40 mt-1">
                          {new Date(r.created_at).toLocaleDateString("es-ES")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-carbon max-w-[140px]">
                        <p className="truncate">{order?.email}</p>
                        {r.customer_note ? (
                          <p className="text-xs text-carbon/50 mt-1 line-clamp-2" title={r.customer_note}>
                            {r.customer_note}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-carbon/80">
                        {RETURN_REASON_LABELS[r.reason as keyof typeof RETURN_REASON_LABELS] ?? r.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBadgeClass[r.status] || ""}>
                          {RETURN_STATUS_LABELS[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {redsys ? (
                          <div className="space-y-1">
                            <p className="font-mono text-carbon/80">{redsys}</p>
                            {order?.redsys_auth_code ? (
                              <p className="text-carbon/40">Auth: {order.redsys_auth_code}</p>
                            ) : null}
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Copiar n.º pedido Redsys"
                                onClick={() => void copyText(redsys, "N.º pedido")}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Abrir Canales"
                                asChild
                              >
                                <a href={canalesUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-carbon/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right min-w-[220px]">
                        <div className="space-y-2">
                          <div>
                            <Label className="text-[10px] text-carbon/40">Nota interna (opcional)</Label>
                            <Textarea
                              value={adminNotes[r.id] ?? r.admin_note ?? ""}
                              onChange={(e) =>
                                setAdminNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              rows={2}
                              className="mt-1 text-xs min-h-[52px]"
                              placeholder="Visible para el cliente en el email…"
                            />
                          </div>
                          {r.status === "product_received" ? (
                            <div>
                              <Label className="text-[10px] text-carbon/40">Importe reembolsado (€)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="mt-1 h-8 text-sm"
                                value={refundAmounts[r.id] ?? defaultRefund}
                                onChange={(e) =>
                                  setRefundAmounts((prev) => ({ ...prev, [r.id]: e.target.value }))
                                }
                              />
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-1 justify-end">
                            {r.status === "requested" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={isBusy}
                                  className="bg-gold hover:bg-gold/90 text-white h-8"
                                  onClick={() => void runAction(r.id, "approve")}
                                >
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  className="h-8 border-red-200 text-red-600"
                                  onClick={() => void runAction(r.id, "reject")}
                                >
                                  Rechazar
                                </Button>
                              </>
                            ) : null}
                            {r.status === "approved" ? (
                              <Button
                                size="sm"
                                disabled={isBusy}
                                className="bg-gold hover:bg-gold/90 text-white h-8"
                                onClick={() => void runAction(r.id, "product_received")}
                              >
                                Producto recibido
                              </Button>
                            ) : null}
                            {r.status === "product_received" ? (
                              <Button
                                size="sm"
                                disabled={isBusy}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                onClick={() => {
                                  const amt = Number(refundAmounts[r.id] ?? defaultRefund);
                                  if (!Number.isFinite(amt) || amt <= 0) {
                                    toast({
                                      title: "Importe inválido",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  void runAction(r.id, "refund", { refundedAmount: amt });
                                }}
                              >
                                Marcar reembolsado
                              </Button>
                            ) : null}
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : null}
                          </div>
                          {r.status === "product_received" ? (
                            <p className="text-[10px] text-amber-700 text-right">
                              Tras marcar reembolsado, ejecuta la devolución en Canales con el n.º de pedido.
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReturnsManager;
