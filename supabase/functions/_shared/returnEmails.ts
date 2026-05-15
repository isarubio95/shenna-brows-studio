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

export function buildReturnCustomerStatusHtml(params: {
  status: string;
  orderIdShort: string;
  adminNote: string | null;
}): string {
  const blocks: Record<string, { title: string; body: string }> = {
    approved: {
      title: "Devolución aprobada",
      body:
        "Hemos aprobado tu solicitud. Envía el producto en su embalaje original (sin usar). Los gastos de envío de vuelta corren a tu cargo salvo producto defectuoso o error en el pedido.",
    },
    rejected: {
      title: "Solicitud no aceptada",
      body:
        "No podemos proceder con esta devolución en las condiciones actuales. Si crees que es un error, escribe a info@shennabrows.com.",
    },
    product_received: {
      title: "Producto recibido",
      body:
        "Hemos recibido tu devolución y estamos comprobando el artículo. Te avisaremos cuando tramitemos el reembolso en la tarjeta.",
    },
    refunded: {
      title: "Reembolso realizado",
      body:
        "El reembolso se ha tramitado a la tarjeta con la que pagaste. Puede tardar varios días en aparecer en tu extracto.",
    },
    cancelled: {
      title: "Solicitud cancelada",
      body: "Has cancelado la solicitud de devolución de este pedido.",
    },
  };
  const block = blocks[params.status];
  if (!block) return "";
  const note = params.adminNote
    ? `<p style="margin-top: 16px;"><strong>Nota del equipo:</strong><br/>${escapeHtml(params.adminNote)}</p>`
    : "";
  return `<div style="font-family: Georgia, serif; color: #2c2c2c; max-width: 560px;">
      <h2 style="color: #b8860b;">${escapeHtml(block.title)}</h2>
      <p>Pedido <strong>${escapeHtml(params.orderIdShort)}</strong></p>
      <p>${block.body}</p>
      ${note}
      <p style="color: #666; font-size: 14px; margin-top: 24px;">Shenna Brows Studio · info@shennabrows.com</p>
    </div>`;
}
