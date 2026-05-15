export type ReturnRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "product_received"
  | "refunded"
  | "cancelled";

export type ReturnReason = "defective" | "wrong_product" | "changed_mind" | "other";

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  defective: "Producto defectuoso",
  wrong_product: "No coincide con el pedido",
  changed_mind: "Cambié de opinión",
  other: "Otro motivo",
};

export const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  requested: "Solicitada",
  approved: "Aprobada — envía el producto",
  rejected: "Rechazada",
  product_received: "Producto recibido",
  refunded: "Reembolsada",
  cancelled: "Cancelada",
};

export const ACTIVE_RETURN_STATUSES: ReturnRequestStatus[] = [
  "requested",
  "approved",
  "product_received",
];

/** Pedidos enviados por el admin: solo entonces el cliente puede solicitar devolución */
export const ELIGIBLE_RETURN_ORDER_STATUSES = new Set(["shipped", "delivered"]);

export function canCancelOrder(orderStatus: string, refundStatus: string | null | undefined): boolean {
  if (orderStatus !== "paid") return false;
  if (refundStatus && refundStatus !== "none") return false;
  return true;
}

export function canRequestReturn(orderStatus: string, refundStatus: string | null | undefined): boolean {
  if (!ELIGIBLE_RETURN_ORDER_STATUSES.has(orderStatus)) return false;
  if (refundStatus && refundStatus !== "none") return false;
  return true;
}

export function getRedsysCanalesUrl(): string {
  const env = (import.meta.env.VITE_REDSYS_ENV as string | undefined)?.toLowerCase();
  const isProd = env === "production" || env === "prod";
  return isProd
    ? "https://canales.redsys.es/lacaixa"
    : "https://sis-t.redsys.es:25443/canales/";
}
