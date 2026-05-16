import type { ReturnRequestStatus } from "@/lib/returns";
import { pickLatestReturnRequest } from "@/lib/returns";

type OrderForInvoice = {
  status: string;
  refund_status?: string | null;
  returned?: boolean | null;
  return_requests?: { status: ReturnRequestStatus; created_at: string; refunded_amount?: number | null }[] | null;
};

export function qualifiesForReturnCreditInvoice(order: OrderForInvoice): boolean {
  const refundStatus = order.refund_status ?? "none";
  if (order.status === "cancelled" && (refundStatus === "full" || order.returned === true)) {
    return true;
  }
  if (order.returned === true && refundStatus !== "none") {
    return true;
  }
  const latest = pickLatestReturnRequest(order.return_requests ?? undefined);
  if (latest?.status === "refunded") {
    return true;
  }
  if (refundStatus === "partial") {
    return true;
  }
  return false;
}

export function getOrderInvoiceButtonLabel(order: OrderForInvoice): string {
  return qualifiesForReturnCreditInvoice(order) ? "Factura devolución" : "Factura";
}

export function canDownloadOrderInvoice(order: OrderForInvoice): boolean {
  const paidLike = new Set(["paid", "shipped", "delivered"]);
  if (paidLike.has(order.status)) return true;
  return qualifiesForReturnCreditInvoice(order);
}
