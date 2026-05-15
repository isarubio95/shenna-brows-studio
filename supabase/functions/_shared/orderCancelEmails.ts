function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOrderCancelAdminNotifyHtml(params: {
  orderId: string;
  orderEmail: string;
  redsysOrder: string | null;
  total: number;
  customerNote: string | null;
}): string {
  const note = params.customerNote
    ? `<p><strong>Comentario del cliente:</strong><br/>${escapeHtml(params.customerNote)}</p>`
    : "";
  return `<div style="font-family: Georgia, serif; color: #2c2c2c; max-width: 560px;">
      <h2 style="color: #b8860b;">Pedido cancelado por el cliente</h2>
      <p>El cliente ha cancelado el pedido antes del envío. Tramita el reembolso en Redsys Canales.</p>
      <ul style="line-height: 1.6;">
        <li><strong>Pedido:</strong> ${escapeHtml(params.orderId)}</li>
        <li><strong>Email cliente:</strong> ${escapeHtml(params.orderEmail)}</li>
        <li><strong>Ref. Redsys:</strong> ${escapeHtml(params.redsysOrder ?? "—")}</li>
        <li><strong>Importe:</strong> €${params.total.toFixed(2)}</li>
      </ul>
      ${note}
    </div>`;
}

export function buildOrderCancelCustomerHtml(params: {
  orderIdShort: string;
  total: number;
}): string {
  return `<div style="font-family: Georgia, serif; color: #2c2c2c; max-width: 560px;">
      <h2 style="color: #b8860b;">Pedido cancelado</h2>
      <p>Hemos registrado la cancelación de tu pedido <strong>${escapeHtml(params.orderIdShort)}</strong>.</p>
      <p>Procederemos al reembolso de <strong>€${params.total.toFixed(2)}</strong> en la tarjeta con la que pagaste. Puede tardar varios días en aparecer en tu extracto.</p>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">Shenna Brows Studio · info@shennabrows.com</p>
    </div>`;
}
