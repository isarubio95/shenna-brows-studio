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

/** Devolución con producto ya recibido: no enviar ni imprimir etiqueta Correos. */
export function returnStatusBlocksFulfillment(status: ReturnRequestStatus | null | undefined): boolean {
  return status === "product_received";
}

/** Pedidos enviados por el admin: solo entonces el cliente puede solicitar devolución */
export const ELIGIBLE_RETURN_ORDER_STATUSES = new Set(["shipped", "delivered"]);

export function canCancelOrder(orderStatus: string, refundStatus: string | null | undefined): boolean {
  if (orderStatus !== "paid") return false;
  if (refundStatus && refundStatus !== "none") return false;
  return true;
}

export function canRequestReturn(
  orderStatus: string,
  refundStatus: string | null | undefined,
  returned?: boolean | null,
): boolean {
  if (returned === true) return false;
  if (!ELIGIBLE_RETURN_ORDER_STATUSES.has(orderStatus)) return false;
  if (refundStatus && refundStatus !== "none") return false;
  return true;
}

export type OrderReturnDisplay = {
  label: string;
  badgeClass: string;
};

export function getOrderReturnDisplay(
  order: {
    returned?: boolean | null;
    refund_status?: string | null;
  },
  latestReturn?: { status: ReturnRequestStatus } | null,
): OrderReturnDisplay | null {
  if (order.returned === true) {
    return { label: "Devuelto", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  const refundStatus = order.refund_status ?? "none";
  if (refundStatus === "partial") {
    return { label: "Reembolso parcial", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (latestReturn) {
    const status = latestReturn.status;
    const badgeByStatus: Record<ReturnRequestStatus, string> = {
      requested: "bg-amber-100 text-amber-800 border-amber-200",
      approved: "bg-sky-100 text-sky-800 border-sky-200",
      product_received: "bg-violet-100 text-violet-800 border-violet-200",
      refunded: "bg-emerald-100 text-emerald-800 border-emerald-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      cancelled: "bg-gray-100 text-gray-600 border-gray-200",
    };
    return {
      label: RETURN_STATUS_LABELS[status],
      badgeClass: badgeByStatus[status] ?? "bg-gray-100 text-gray-700 border-gray-200",
    };
  }
  return null;
}

export function pickLatestReturnRequest<T extends { created_at: string }>(requests: T[] | null | undefined): T | null {
  if (!requests?.length) return null;
  return [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

export function getRedsysCanalesUrl(): string {
  const env = (import.meta.env.VITE_REDSYS_ENV as string | undefined)?.toLowerCase();
  const isProd = env === "production" || env === "prod";
  return isProd
    ? "https://canales.redsys.es/lacaixa"
    : "https://sis-t.redsys.es:25443/canales/";
}
