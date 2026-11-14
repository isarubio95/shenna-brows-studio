const REASON_LABELS: Record<string, string> = {
  defective: "Producto defectuoso",
  wrong_product: "No coincide con el pedido",
  changed_mind: "Cambié de opinión",
  other: "Otro motivo",
};

export function returnReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildReturnAdminNotifyHtml(params: {
  orderId: string;
  orderEmail: string;
  redsysOrder: string | null;
  reason: string;
  customerNote: string | null;
  requestedAmount: number;
}): string {
  const note = params.customerNote
    ? `<p><strong>Comentario del cliente:</strong><br/>${escapeHtml(params.customerNote)}</p>`
    : "";
  return `<div style="font-family: Georgia, serif; color: #2c2c2c; max-width: 560px;">
      <h2 style="color: #b8860b;">Nueva solicitud de devolución</h2>
      <p>Se ha registrado una solicitud en la web.</p>
      <ul style="line-height: 1.6;">
        <li><strong>Pedido:</strong> ${escapeHtml(params.orderId)}</li>
        <li><strong>Email cliente:</strong> ${escapeHtml(params.orderEmail)}</li>
        <li><strong>Ref. Redsys:</strong> ${escapeHtml(params.redsysOrder ?? "—")}</li>
        <li><strong>Motivo:</strong> ${escapeHtml(returnReasonLabel(params.reason))}</li>
        <li><strong>Importe pedido:</strong> €${params.requestedAmount.toFixed(2)}</li>
      </ul>
      ${note}
      <p style="color: #666; font-size: 14px;">Revisa el panel de administración para gestionar la solicitud.</p>
    </div>`;
}
