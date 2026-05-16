/** Correo al cliente cuando el pedido consta como entregado (Correos). */

export const SHENNA_INSTAGRAM_URL = "https://www.instagram.com/shennabrows/";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getPublicSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL")?.trim() || "https://shennabrows.com";
  return raw.replace(/\/+$/, "");
}

export function buildAccountReviewUrl(siteUrl?: string): string {
  const base = (siteUrl ?? getPublicSiteUrl()).replace(/\/+$/, "");
  return `${base}/account#tu-experiencia`;
}

export function buildOrderDeliveredHtml(args: {
  orderRef: string;
  accountReviewUrl: string;
  instagramUrl?: string;
}): string {
  const instagramUrl = args.instagramUrl?.trim() || SHENNA_INSTAGRAM_URL;
  const orderRef = escapeHtml(args.orderRef);
  const reviewUrl = escapeHtml(args.accountReviewUrl);
  const instagramHref = escapeHtml(instagramUrl);

  return `
    <div style="background: #f8fafc; padding: 24px 12px; font-family: Arial, sans-serif; color: #1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
        <tr>
          <td style="padding: 24px; background: #111827; color: #ffffff;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.85;">Shenna Brows</p>
            <h2 style="margin: 8px 0 0; font-size: 24px; line-height: 1.25;">¡Tu pedido ha llegado!</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.55; color: #334155;">
              Esperamos que disfrutes de tu compra. Tu pedido <strong>${orderRef}</strong> consta como entregado.
            </p>
            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.55; color: #334155;">
              Nos encantaría conocer tu opinión: entra en <strong>Mi cuenta</strong> y comparte tu experiencia con nuestras herramientas.
            </p>
            <p style="margin: 0 0 12px; text-align: center;">
              <a href="${reviewUrl}" style="display: inline-block; padding: 12px 22px; background: #b8860b; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 600;">
                Dejar mi valoración en Mi cuenta
              </a>
            </p>
            <p style="margin: 24px 0 12px; font-size: 14px; line-height: 1.5; color: #475569; text-align: center;">
              Síguenos en Instagram para ver novedades, tutoriales y el día a día del estudio — el mismo perfil que encontrarás en nuestra página Conócenos.
            </p>
            <p style="margin: 0; text-align: center;">
              <a href="${instagramHref}" style="display: inline-block; padding: 10px 18px; background: #fdf4ff; color: #831843; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; border: 1px solid #f9a8d4;">
                @shennabrows en Instagram
              </a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 24px 24px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
              Shenna Brows Studio · <a href="mailto:info@shennabrows.com" style="color: #b8860b;">info@shennabrows.com</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}
