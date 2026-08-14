import { escapeHtml, formatEur } from "./orderConfirmationEmail.ts";
import { formatDiscountLabel, type DiscountCodeRow } from "./discountCodes.ts";

export function buildWelcomeDiscountEmailHtml(args: {
  code: string;
  discount: Pick<DiscountCodeRow, "discount_type" | "discount_value" | "min_subtotal" | "first_order_only">;
}): string {
  const label = formatDiscountLabel(args.discount);
  const min =
    args.discount.min_subtotal == null
      ? null
      : Number(args.discount.min_subtotal);
  const minText =
    min != null && Number.isFinite(min)
      ? ` en pedidos a partir de ${formatEur(min)}`
      : "";
  const firstOrderText = args.discount.first_order_only
    ? " Válido en tu primer pedido."
    : "";

  return `
    <div style="background: #f8fafc; padding: 24px 12px; font-family: Arial, sans-serif; color: #1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
        <tr>
          <td style="padding: 24px; background: #1A1A1A; color: #ffffff;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.85;">Shenna Brows</p>
            <h2 style="margin: 8px 0 0; font-size: 24px; line-height: 1.25;">Tu descuento de bienvenida</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
              Gracias por suscribirte. Aquí tienes tu código de descuento de <strong>${escapeHtml(label)}</strong>${escapeHtml(minText)}.${escapeHtml(firstOrderText)}
            </p>
            <div style="margin: 0 0 20px; padding: 18px 16px; background: #F9F7F2; border: 1px solid #C5A05955; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #C5A059;">Tu código</p>
              <p style="margin: 0; font-size: 28px; letter-spacing: 0.12em; color: #1A1A1A; font-family: Consolas, ui-monospace, monospace; font-weight: 700;">
                ${escapeHtml(args.code)}
              </p>
            </div>
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #64748b;">
              Introdúcelo en el checkout al finalizar tu compra. Si tienes cualquier duda, responde a este correo.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}
