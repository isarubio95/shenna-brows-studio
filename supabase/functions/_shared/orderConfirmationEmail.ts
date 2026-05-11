/** Plantilla HTML del correo de confirmación de pedido (pago y/o seguimiento Correos). */

export type OrderConfirmationVariant = "paid" | "tracking";

export type OrderConfirmationLine = { name: string; quantity: number; unitPrice: number };

export function formatEur(value: number): string {
  return Number(value || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function correosTrackingUrl(shipmentCode: string): string {
  const code = shipmentCode.trim();
  return `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${encodeURIComponent(code)}`;
}

export function buildOrderConfirmationHtml(args: {
  variant: OrderConfirmationVariant;
  orderRef: string;
  subtotal: number;
  shipping: number;
  total: number;
  lines: OrderConfirmationLine[];
  correosShipmentCode?: string | null;
}): string {
  const isTrackingVariant = args.variant === "tracking";
  const code = String(args.correosShipmentCode ?? "").trim();
  const hasTracking = Boolean(code);

  const title = isTrackingVariant ? "Seguimiento Correos" : "Pago confirmado";
  const lead = isTrackingVariant
    ? "Tu pedido ya tiene número de seguimiento de Correos. Puedes localizar el envío en la web de Correos. Incluimos también el resumen de la compra."
    : "Gracias por tu pedido. Hemos recibido el pago correctamente y ya estamos preparando tu compra.";

  const linesHtml = args.lines
    .map(
      (line) =>
        `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">
              ${escapeHtml(line.name)}
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155;">
              x${line.quantity}
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a;">
              ${formatEur(line.unitPrice * line.quantity)}
            </td>
          </tr>
        `,
    )
    .join("");

  const trackingBlock = hasTracking
    ? `
            <div style="margin: 0 0 18px; padding: 14px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;">
              <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #166534;">Número de seguimiento Correos</p>
              <p style="margin: 0 0 12px; font-size: 18px; letter-spacing: 0.06em; color: #14532d; font-family: Consolas, ui-monospace, monospace;">
                ${escapeHtml(code)}
              </p>
              <a href="${escapeHtml(correosTrackingUrl(code))}" style="display: inline-block; padding: 10px 16px; background: #166534; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Seguir envío en Correos
              </a>
            </div>
          `
    : "";

  return `
    <div style="background: #f8fafc; padding: 24px 12px; font-family: Arial, sans-serif; color: #1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
        <tr>
          <td style="padding: 24px; background: #111827; color: #ffffff;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.85;">Shenna Brows Studio</p>
            <h2 style="margin: 8px 0 0; font-size: 24px; line-height: 1.25;">${escapeHtml(title)}</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.5; color: #334155;">
              ${escapeHtml(lead)}
            </p>
            <p style="margin: 0 0 18px; font-size: 14px; color: #475569;">
              <strong>Referencia del pedido:</strong> ${escapeHtml(args.orderRef)}
            </p>
            ${trackingBlock}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Producto</th>
                  <th align="center" style="padding: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Cant.</th>
                  <th align="right" style="padding: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Importe</th>
                </tr>
              </thead>
              <tbody>
                ${linesHtml}
              </tbody>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 18px;">
              <tr>
                <td style="padding: 4px 0; color: #475569;">Subtotal</td>
                <td style="padding: 4px 0; text-align: right; color: #0f172a;">${formatEur(args.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #475569;">Envío</td>
                <td style="padding: 4px 0; text-align: right; color: #0f172a;">${formatEur(args.shipping)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0; font-weight: 700; color: #0f172a;">Total</td>
                <td style="padding: 12px 0 0; text-align: right; font-weight: 700; color: #0f172a;">${formatEur(args.total)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}
