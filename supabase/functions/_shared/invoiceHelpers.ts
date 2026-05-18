import type { PurchaseTicketLine } from "./purchaseTicket.ts";

export function formatInvoiceDateEs(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function buildSimplifiedInvoiceNumber(orderRef: string, issuedAt: Date): string {
  const ymd = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  return `T-${ymd}-${orderRef}`;
}

export function buildRectificativeInvoiceNumber(orderRef: string, issuedAt: Date): string {
  const ymd = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  return `FR-${ymd}-${orderRef}`;
}

export type RefundInvoiceContext = {
  isCreditNote: boolean;
  reason: "cancelacion" | "devolucion";
  refundGrossTotal: number;
  refundSubtotal: number;
  refundShipping: number;
  lines: PurchaseTicketLine[];
};

export function resolveRefundInvoiceContext(args: {
  orderStatus: string;
  orderSubtotal: number;
  orderShipping: number;
  orderTotal: number;
  refundStatus: string;
  returned: boolean;
  lines: PurchaseTicketLine[];
  refundedReturnAmounts: number[];
}): RefundInvoiceContext | null {
  const orderTotal = Number(args.orderTotal) || 0;
  if (orderTotal <= 0) return null;

  const sumRefunded = args.refundedReturnAmounts.reduce((s, n) => s + Number(n || 0), 0);
  const isCancelledFull =
    args.orderStatus === "cancelled" &&
    (args.refundStatus === "full" || args.returned);
  const isReturnedFull = args.returned && args.refundStatus === "full";
  const hasRefundedReturn = sumRefunded > 0;

  if (!isCancelledFull && !isReturnedFull && !hasRefundedReturn) {
    return null;
  }

  let refundGrossTotal = orderTotal;
  if (hasRefundedReturn && !isCancelledFull && !isReturnedFull) {
    refundGrossTotal = Math.min(orderTotal, sumRefunded);
  } else if (args.refundStatus === "partial" && sumRefunded > 0) {
    refundGrossTotal = Math.min(orderTotal, sumRefunded);
  }

  const isFullRefund = refundGrossTotal >= orderTotal - 0.01;
  const ratio = isFullRefund ? 1 : refundGrossTotal / orderTotal;
  const refundSubtotal = Math.round(args.orderSubtotal * ratio * 100) / 100;
  const refundShipping = Math.round(args.orderShipping * ratio * 100) / 100;

  let lines: PurchaseTicketLine[];
  if (isFullRefund) {
    lines = args.lines.map((line) => ({ ...line }));
  } else {
    lines = [
      {
        name: "Abono por devolución parcial",
        quantity: 1,
        unitPrice: refundGrossTotal,
      },
    ];
  }

  const reason: "cancelacion" | "devolucion" =
    args.orderStatus === "cancelled" ? "cancelacion" : "devolucion";

  return {
    isCreditNote: true,
    reason,
    refundGrossTotal,
    refundSubtotal: isFullRefund ? refundSubtotal : refundGrossTotal,
    refundShipping: isFullRefund ? refundShipping : 0,
    lines,
  };
}
