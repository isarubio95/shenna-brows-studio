/**
 * Emails automáticos que reciben las clientas: textos por defecto, textos que la
 * admin guarda desde el panel (`site_content.customer_emails`) y el HTML final.
 *
 * Módulo sin dependencias ni APIs de Deno: lo usan las Edge Functions para enviar
 * y el panel (`src/`) para editar y previsualizar, así ambos pintan lo mismo.
 */

export const CUSTOMER_EMAILS_CONTENT_KEY = "customer_emails";

export type CustomerEmailKey =
  | "order_paid"
  | "order_tracking"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "return_approved"
  | "return_rejected"
  | "return_product_received"
  | "return_refunded"
  | "return_cancelled"
  | "welcome_discount"
  | "newsletter_welcome";

export type CustomerEmailField =
  | "subject"
  | "title"
  | "body"
  | "bodyAlt"
  | "button"
  | "extra"
  | "extraButton"
  | "footnote";

export type CustomerEmailGroup = "pedidos" | "devoluciones" | "newsletter";

export interface CustomerEmailFieldDef {
  key: CustomerEmailField;
  label: string;
  multiline?: boolean;
  /** Se puede dejar vacío para que no salga; si no, vacío vuelve al texto original. */
  optional?: boolean;
  help?: string;
}

export interface CustomerEmailPlaceholder {
  token: string;
  label: string;
}

export interface CustomerEmailDef {
  key: CustomerEmailKey;
  group: CustomerEmailGroup;
  label: string;
  /** Cuándo sale, en palabras de la admin. */
  trigger: string;
  placeholders: CustomerEmailPlaceholder[];
  fields: CustomerEmailFieldDef[];
  defaults: Partial<Record<CustomerEmailField, string>>;
}

export const CUSTOMER_EMAIL_GROUP_LABELS: Record<CustomerEmailGroup, string> = {
  pedidos: "Pedidos",
  devoluciones: "Devoluciones",
  newsletter: "Newsletter",
};

const SUBJECT: CustomerEmailFieldDef = { key: "subject", label: "Asunto" };
const TITLE: CustomerEmailFieldDef = { key: "title", label: "Título (cabecera del email)" };
const BODY: CustomerEmailFieldDef = {
  key: "body",
  label: "Texto",
  multiline: true,
  help: "Deja una línea en blanco para separar párrafos. **Así** se pone en negrita.",
};

const ORDER_PLACEHOLDERS: CustomerEmailPlaceholder[] = [
  { token: "{pedido}", label: "referencia del pedido" },
  { token: "{total}", label: "total pagado" },
];
const SHORT_ORDER_PLACEHOLDER: CustomerEmailPlaceholder[] = [
  { token: "{pedido}", label: "número corto del pedido" },
];

const ORDER_SUMMARY_NOTE = "Debajo del texto va siempre el resumen de la compra.";

export const CUSTOMER_EMAILS: CustomerEmailDef[] = [
  {
    key: "order_paid",
    group: "pedidos",
    label: "Pago confirmado",
    trigger: `Al pagar un pedido. Lleva el ticket en PDF. ${ORDER_SUMMARY_NOTE}`,
    placeholders: ORDER_PLACEHOLDERS,
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Confirmación de pedido - Shenna Brows",
      title: "Pago confirmado",
      body: "Gracias por tu pedido. Hemos recibido el pago correctamente y ya estamos preparando tu compra.",
    },
  },
  {
    key: "order_tracking",
    group: "pedidos",
    label: "Número de seguimiento",
    trigger: `Cuando envías desde el panel el número de seguimiento de Correos. ${ORDER_SUMMARY_NOTE}`,
    placeholders: ORDER_PLACEHOLDERS,
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Confirmación de pedido (seguimiento Correos) - Shenna Brows",
      title: "Seguimiento Correos",
      body: "Tu pedido ya tiene número de seguimiento de Correos. Puedes localizar el envío en la web de Correos. Incluimos también el resumen de la compra.",
    },
  },
  {
    key: "order_shipped",
    group: "pedidos",
    label: "Pedido enviado",
    trigger: `Al marcar un pedido como enviado. ${ORDER_SUMMARY_NOTE}`,
    placeholders: ORDER_PLACEHOLDERS,
    fields: [
      SUBJECT,
      TITLE,
      { ...BODY, label: "Texto (con número de seguimiento)" },
      { key: "bodyAlt", label: "Texto (sin número de seguimiento)", multiline: true },
    ],
    defaults: {
      subject: "Tu pedido ya ha sido enviado — Shenna Brows",
      title: "Tu pedido ya ha sido enviado",
      body: "Tu pedido ya está en camino. Puedes seguir el envío en Correos con el número de abajo. Incluimos el resumen de tu compra.",
      bodyAlt: "Tu pedido ya está en camino hacia la dirección de envío. Incluimos el resumen de tu compra.",
    },
  },
  {
    key: "order_delivered",
    group: "pedidos",
    label: "Pedido entregado",
    trigger: "Cuando Correos marca el pedido como entregado, o al marcarlo tú desde el panel.",
    placeholders: [{ token: "{pedido}", label: "referencia del pedido" }],
    fields: [
      SUBJECT,
      TITLE,
      BODY,
      { key: "button", label: "Botón (lleva a Mi cuenta para valorar)" },
      {
        key: "extra",
        label: "Texto de Instagram",
        multiline: true,
        optional: true,
        help: "Vacío: no sale el bloque de Instagram.",
      },
      { key: "extraButton", label: "Botón de Instagram", optional: true },
    ],
    defaults: {
      subject: "Tu pedido ha sido entregado — Shenna Brows",
      title: "¡Tu pedido ha llegado!",
      body:
        "Esperamos que disfrutes de tu compra. Tu pedido **{pedido}** consta como entregado.\n\n" +
        "Nos encantaría conocer tu opinión: entra en **Mi cuenta** y comparte tu experiencia con nuestras herramientas.",
      button: "Dejar mi valoración en Mi cuenta",
      extra:
        "Síguenos en Instagram para ver novedades, tutoriales y el día a día del estudio — el mismo perfil que encontrarás en nuestra página Conócenos.",
      extraButton: "@shennabrows en Instagram",
    },
  },
  {
    key: "order_cancelled",
    group: "pedidos",
    label: "Pedido cancelado",
    trigger: "Cuando la clienta cancela su pedido antes del envío.",
    placeholders: [...SHORT_ORDER_PLACEHOLDER, { token: "{importe}", label: "importe a reembolsar" }],
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Tu pedido ha sido cancelado — Shenna Brows",
      title: "Pedido cancelado",
      body:
        "Hemos registrado la cancelación de tu pedido **{pedido}**.\n\n" +
        "Procederemos al reembolso de **{importe}** en la tarjeta con la que pagaste. Puede tardar varios días en aparecer en tu extracto.",
    },
  },
  {
    key: "return_approved",
    group: "devoluciones",
    label: "Devolución aprobada",
    trigger: "Al aprobar una solicitud de devolución. Si escribes una nota, sale debajo.",
    placeholders: SHORT_ORDER_PLACEHOLDER,
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Tu devolución ha sido aprobada",
      title: "Devolución aprobada",
      body:
        "Pedido **{pedido}**\n\n" +
        "Hemos aprobado tu solicitud. Envía el producto en su embalaje original (sin usar). Los gastos de envío de vuelta corren a tu cargo salvo producto defectuoso o error en el pedido.",
    },
  },
  {
    key: "return_rejected",
    group: "devoluciones",
    label: "Devolución rechazada",
    trigger: "Al rechazar una solicitud de devolución. Si escribes una nota, sale debajo.",
    placeholders: SHORT_ORDER_PLACEHOLDER,
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Actualización sobre tu solicitud de devolución",
      title: "Solicitud no aceptada",
      body:
        "Pedido **{pedido}**\n\n" +
        "No podemos proceder con esta devolución en las condiciones actuales. Si crees que es un error, escribe a info@shennabrows.com.",
    },
  },
  {
    key: "return_product_received",
    group: "devoluciones",
    label: "Producto devuelto recibido",
    trigger: "Al marcar que ha llegado el producto devuelto.",
    placeholders: SHORT_ORDER_PLACEHOLDER,
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Hemos recibido tu devolución",
      title: "Producto recibido",
      body:
        "Pedido **{pedido}**\n\n" +
        "Hemos recibido tu devolución y estamos comprobando el artículo. Te avisaremos cuando tramitemos el reembolso en la tarjeta.",
    },
  },
  {
    key: "return_refunded",
    group: "devoluciones",
    label: "Reembolso hecho",
    trigger: "Al tramitar el reembolso de una devolución.",
    placeholders: SHORT_ORDER_PLACEHOLDER,
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Reembolso tramitado",
      title: "Reembolso realizado",
      body:
        "Pedido **{pedido}**\n\n" +
        "El reembolso se ha tramitado a la tarjeta con la que pagaste. Puede tardar varios días en aparecer en tu extracto.",
    },
  },
  {
    key: "return_cancelled",
    group: "devoluciones",
    label: "Devolución cancelada",
    trigger: "Cuando se cancela una solicitud de devolución.",
    placeholders: SHORT_ORDER_PLACEHOLDER,
    fields: [SUBJECT, TITLE, BODY],
    defaults: {
      subject: "Solicitud de devolución cancelada",
      title: "Solicitud cancelada",
      body: "Pedido **{pedido}**\n\nHas cancelado la solicitud de devolución de este pedido.",
    },
  },
  {
    key: "welcome_discount",
    group: "newsletter",
    label: "Código de bienvenida (pop-up)",
    trigger:
      "Al registrarse desde el pop-up, si hay un código activo marcado como oferta de bienvenida. Si no lo hay, recibe el email de bienvenida de abajo.",
    placeholders: [
      { token: "{descuento}", label: "el descuento, p. ej. 10,00 €" },
      { token: "{codigo}", label: "el código" },
      { token: "{condiciones}", label: "pedido mínimo y primer pedido, si los tiene" },
    ],
    fields: [
      SUBJECT,
      TITLE,
      { ...BODY, help: `${BODY.help} El código sale en grande debajo del texto.` },
      { key: "footnote", label: "Nota final", multiline: true, optional: true },
    ],
    defaults: {
      subject: "Tu código de descuento {descuento} — Shenna Brows",
      title: "Tu descuento de bienvenida",
      body: "Gracias por suscribirte. Aquí tienes tu código de descuento de **{descuento}**. {condiciones}",
      footnote:
        "Introdúcelo en el checkout al finalizar tu compra. Si tienes cualquier duda, responde a este correo.",
    },
  },
  {
    key: "newsletter_welcome",
    group: "newsletter",
    label: "Bienvenida a la newsletter",
    trigger: "Al suscribirse a la newsletter desde el pie de página, el registro de cuenta o el botón de la campaña.",
    placeholders: [],
    fields: [
      SUBJECT,
      TITLE,
      BODY,
      { key: "button", label: "Botón (lleva a la tienda)", optional: true, help: "Vacío: no sale el botón." },
    ],
    defaults: {
      subject: "¡Bienvenida a Shenna Brows!",
      title: "¡Gracias por suscribirte!",
      body:
        "Ya formas parte de la comunidad Shenna Brows. Serás de las primeras en enterarte de lanzamientos, ofertas y consejos para cuidar tus cejas.\n\n" +
        "Mientras tanto, echa un vistazo a nuestras herramientas.",
      button: "Descubrir la tienda",
    },
  },
];

const DEFS_BY_KEY = new Map(CUSTOMER_EMAILS.map((def) => [def.key, def]));

export function customerEmailDef(key: CustomerEmailKey): CustomerEmailDef {
  const def = DEFS_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown customer email: ${key}`);
  return def;
}

/** Lo guardado en el panel: solo los campos que la admin ha cambiado. */
export type CustomerEmailOverrides = Partial<
  Record<CustomerEmailKey, Partial<Record<CustomerEmailField, string>>>
>;

export type ResolvedCustomerEmail = Record<CustomerEmailField, string>;

export function parseCustomerEmailOverrides(raw: unknown): CustomerEmailOverrides {
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return {};
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object") return {};
  const emails = (value as { emails?: unknown }).emails;
  if (!emails || typeof emails !== "object") return {};

  const out: CustomerEmailOverrides = {};
  for (const def of CUSTOMER_EMAILS) {
    const saved = (emails as Record<string, unknown>)[def.key];
    if (!saved || typeof saved !== "object") continue;
    const fields: Partial<Record<CustomerEmailField, string>> = {};
    for (const field of def.fields) {
      const text = (saved as Record<string, unknown>)[field.key];
      if (typeof text === "string") fields[field.key] = text;
    }
    if (Object.keys(fields).length) out[def.key] = fields;
  }
  return out;
}

/** Guarda solo lo que difiere del texto original, para que mejoras futuras lleguen solas. */
export function serializeCustomerEmailOverrides(overrides: CustomerEmailOverrides): string {
  const emails: CustomerEmailOverrides = {};
  for (const def of CUSTOMER_EMAILS) {
    const saved = overrides[def.key];
    if (!saved) continue;
    const fields: Partial<Record<CustomerEmailField, string>> = {};
    for (const field of def.fields) {
      const text = saved[field.key];
      if (typeof text !== "string") continue;
      const original = def.defaults[field.key] ?? "";
      if (text.trim() === original.trim()) continue;
      // Un campo obligatorio vacío vuelve al original: no hace falta guardarlo.
      if (!text.trim() && !field.optional) continue;
      fields[field.key] = text.trim();
    }
    if (Object.keys(fields).length) emails[def.key] = fields;
  }
  return JSON.stringify({ version: 1, emails });
}

export function resolveCustomerEmail(
  key: CustomerEmailKey,
  overrides: CustomerEmailOverrides = {},
): ResolvedCustomerEmail {
  const def = customerEmailDef(key);
  const saved = overrides[key] ?? {};
  const out = {
    subject: "",
    title: "",
    body: "",
    bodyAlt: "",
    button: "",
    extra: "",
    extraButton: "",
    footnote: "",
  } as ResolvedCustomerEmail;
  for (const field of def.fields) {
    const original = def.defaults[field.key] ?? "";
    const text = saved[field.key];
    if (typeof text !== "string") out[field.key] = original;
    else if (!text.trim()) out[field.key] = field.optional ? "" : original;
    else out[field.key] = text.trim();
  }
  return out;
}

// ---------------------------------------------------------------- HTML

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatEur(value: number): string {
  return Number(value || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function correosTrackingUrl(shipmentCode: string): string {
  const code = shipmentCode.trim();
  return `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${encodeURIComponent(code)}`;
}

export type EmailVars = Record<string, string>;

/** Sustituye `{pedido}` y demás; los marcadores desconocidos se quedan tal cual. */
export function fillPlaceholders(text: string, vars: EmailVars): string {
  return text.replace(/\{([a-z_]+)\}/gi, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name.toLowerCase()) ? vars[name.toLowerCase()] : match,
  );
}

/** Texto del panel → párrafos HTML: línea en blanco separa, salto simple es <br>, **negrita**. */
export function textToParagraphsHtml(
  text: string,
  vars: EmailVars,
  style = "margin: 0 0 14px; font-size: 15px; line-height: 1.55; color: #334155;",
): string {
  return fillPlaceholders(text, vars)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const html = escapeHtml(block)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br />");
      return `<p style="${style}">${html}</p>`;
    })
    .join("\n");
}

const BRAND_GOLD = "#b8860b";

function buttonHtml(href: string, label: string): string {
  return `
            <p style="margin: 8px 0 12px; text-align: center;">
              <a href="${escapeHtml(href)}" style="display: inline-block; padding: 12px 22px; background: ${BRAND_GOLD}; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 600;">
                ${escapeHtml(label)}
              </a>
            </p>`;
}

export function unsubscribeFooterHtml(unsubscribeUrl: string): string {
  return `
            <p style="margin: 10px 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
              Recibes este email porque te suscribiste a la newsletter de Shenna Brows.
              <a href="${escapeHtml(unsubscribeUrl)}" style="color: #94a3b8; text-decoration: underline;">Darme de baja</a>
            </p>`;
}

function layoutHtml(args: { title: string; content: string; unsubscribeUrl?: string | null }): string {
  return `
    <div style="background: #f8fafc; padding: 24px 12px; font-family: Arial, sans-serif; color: #1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
        <tr>
          <td style="padding: 24px; background: #1A1A1A; color: #ffffff;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.85;">Shenna Brows</p>
            <h2 style="margin: 8px 0 0; font-size: 24px; line-height: 1.25;">${escapeHtml(args.title)}</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
${args.content}
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 24px 24px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
              Shenna Brows Studio · <a href="mailto:info@shennabrows.com" style="color: ${BRAND_GOLD};">info@shennabrows.com</a>
            </p>${args.unsubscribeUrl ? unsubscribeFooterHtml(args.unsubscribeUrl) : ""}
          </td>
        </tr>
      </table>
    </div>
  `;
}

export type OrderEmailLine = { name: string; quantity: number; unitPrice: number };

export interface OrderSummaryData {
  orderRef: string;
  subtotal: number;
  shipping: number;
  total: number;
  discountAmount?: number | null;
  discountCode?: string | null;
  lines: OrderEmailLine[];
  trackingCode?: string | null;
}

function trackingBlockHtml(code: string): string {
  return `
            <div style="margin: 0 0 18px; padding: 14px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;">
              <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #166534;">Número de seguimiento Correos</p>
              <p style="margin: 0 0 12px; font-size: 18px; letter-spacing: 0.06em; color: #14532d; font-family: Consolas, ui-monospace, monospace;">
                ${escapeHtml(code)}
              </p>
              <a href="${escapeHtml(correosTrackingUrl(code))}" style="display: inline-block; padding: 10px 16px; background: #166534; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Seguir envío en Correos
              </a>
            </div>`;
}

function orderSummaryHtml(order: OrderSummaryData): string {
  const linesHtml = order.lines
    .map(
      (line) => `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${escapeHtml(line.name)}</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155;">x${line.quantity}</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a;">${formatEur(line.unitPrice * line.quantity)}</td>
                </tr>`,
    )
    .join("");
  const discount = Number(order.discountAmount ?? 0);
  const discountRow =
    discount > 0
      ? `
              <tr>
                <td style="padding: 4px 0; color: #475569;">Descuento${order.discountCode ? ` (${escapeHtml(String(order.discountCode))})` : ""}</td>
                <td style="padding: 4px 0; text-align: right; color: #0f172a;">−${formatEur(discount)}</td>
              </tr>`
      : "";

  return `
            <p style="margin: 0 0 18px; font-size: 14px; color: #475569;">
              <strong>Referencia del pedido:</strong> ${escapeHtml(order.orderRef)}
            </p>
            ${order.trackingCode?.trim() ? trackingBlockHtml(order.trackingCode.trim()) : ""}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Producto</th>
                  <th align="center" style="padding: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Cant.</th>
                  <th align="right" style="padding: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Importe</th>
                </tr>
              </thead>
              <tbody>${linesHtml}
              </tbody>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 18px;">
              <tr>
                <td style="padding: 4px 0; color: #475569;">Subtotal</td>
                <td style="padding: 4px 0; text-align: right; color: #0f172a;">${formatEur(order.subtotal)}</td>
              </tr>${discountRow}
              <tr>
                <td style="padding: 4px 0; color: #475569;">Envío</td>
                <td style="padding: 4px 0; text-align: right; color: #0f172a;">${formatEur(order.shipping)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0; font-weight: 700; color: #0f172a;">Total</td>
                <td style="padding: 12px 0 0; text-align: right; font-weight: 700; color: #0f172a;">${formatEur(order.total)}</td>
              </tr>
            </table>`;
}

function noteHtml(label: string, note: string | null | undefined): string {
  const text = note?.trim();
  if (!text) return "";
  return `
            <p style="margin: 16px 0 0; font-size: 15px; line-height: 1.55; color: #334155;">
              <strong>${escapeHtml(label)}</strong><br />${escapeHtml(text).replace(/\n/g, "<br />")}
            </p>`;
}

/** Datos que necesita cada email además de sus textos. */
export type CustomerEmailData =
  | { key: "order_paid" | "order_tracking" | "order_shipped"; order: OrderSummaryData }
  | { key: "order_delivered"; orderRef: string; reviewUrl: string; instagramUrl: string }
  | { key: "order_cancelled"; orderRef: string; total: number }
  | {
      key: "return_approved" | "return_rejected" | "return_product_received" | "return_refunded" | "return_cancelled";
      orderRef: string;
      adminNote?: string | null;
    }
  | {
      key: "welcome_discount";
      code: string;
      discountLabel: string;
      minSubtotal: number | null;
      firstOrderOnly: boolean;
      unsubscribeUrl: string;
    }
  | { key: "newsletter_welcome"; shopUrl: string; unsubscribeUrl: string };

export function discountConditionsText(minSubtotal: number | null, firstOrderOnly: boolean): string {
  const hasMin = minSubtotal != null && Number.isFinite(minSubtotal) && minSubtotal > 0;
  if (hasMin && firstOrderOnly) return `Válido en tu primer pedido a partir de ${formatEur(minSubtotal)}.`;
  if (hasMin) return `Válido en pedidos a partir de ${formatEur(minSubtotal)}.`;
  if (firstOrderOnly) return "Válido en tu primer pedido.";
  return "";
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

export function buildCustomerEmail(
  data: CustomerEmailData,
  overrides: CustomerEmailOverrides = {},
): BuiltEmail {
  const t = resolveCustomerEmail(data.key, overrides);

  switch (data.key) {
    case "order_paid":
    case "order_tracking":
    case "order_shipped": {
      const vars = { pedido: data.order.orderRef, total: formatEur(data.order.total) };
      const hasTracking = Boolean(data.order.trackingCode?.trim());
      const lead = data.key === "order_shipped" && !hasTracking ? t.bodyAlt : t.body;
      return {
        subject: fillPlaceholders(t.subject, vars),
        html: layoutHtml({
          title: fillPlaceholders(t.title, vars),
          content: textToParagraphsHtml(lead, vars) + orderSummaryHtml(data.order),
        }),
      };
    }
    case "order_delivered": {
      const vars = { pedido: data.orderRef };
      const instagram = t.extra.trim()
        ? `
            <p style="margin: 24px 0 12px; font-size: 14px; line-height: 1.5; color: #475569; text-align: center;">
              ${escapeHtml(fillPlaceholders(t.extra, vars)).replace(/\n/g, "<br />")}
            </p>${
              t.extraButton.trim()
                ? `
            <p style="margin: 0; text-align: center;">
              <a href="${escapeHtml(data.instagramUrl)}" style="display: inline-block; padding: 10px 18px; background: #fdf4ff; color: #831843; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; border: 1px solid #f9a8d4;">
                ${escapeHtml(t.extraButton)}
              </a>
            </p>`
                : ""
            }`
        : "";
      return {
        subject: fillPlaceholders(t.subject, vars),
        html: layoutHtml({
          title: fillPlaceholders(t.title, vars),
          content: textToParagraphsHtml(t.body, vars) + buttonHtml(data.reviewUrl, t.button) + instagram,
        }),
      };
    }
    case "order_cancelled": {
      const vars = { pedido: data.orderRef, importe: formatEur(data.total) };
      return {
        subject: fillPlaceholders(t.subject, vars),
        html: layoutHtml({
          title: fillPlaceholders(t.title, vars),
          content: textToParagraphsHtml(t.body, vars),
        }),
      };
    }
    case "return_approved":
    case "return_rejected":
    case "return_product_received":
    case "return_refunded":
    case "return_cancelled": {
      const vars = { pedido: data.orderRef };
      return {
        subject: fillPlaceholders(t.subject, vars),
        html: layoutHtml({
          title: fillPlaceholders(t.title, vars),
          content: textToParagraphsHtml(t.body, vars) + noteHtml("Nota del equipo:", data.adminNote),
        }),
      };
    }
    case "welcome_discount": {
      const vars = {
        descuento: data.discountLabel,
        codigo: data.code,
        condiciones: discountConditionsText(data.minSubtotal, data.firstOrderOnly),
      };
      const codeBox = `
            <div style="margin: 6px 0 20px; padding: 18px 16px; background: #F9F7F2; border: 1px solid #C5A05955; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #C5A059;">Tu código</p>
              <p style="margin: 0; font-size: 28px; letter-spacing: 0.12em; color: #1A1A1A; font-family: Consolas, ui-monospace, monospace; font-weight: 700;">
                ${escapeHtml(data.code)}
              </p>
            </div>`;
      const footnote = t.footnote.trim()
        ? textToParagraphsHtml(t.footnote, vars, "margin: 0; font-size: 14px; line-height: 1.5; color: #64748b;")
        : "";
      return {
        subject: fillPlaceholders(t.subject, vars),
        html: layoutHtml({
          title: fillPlaceholders(t.title, vars),
          content: textToParagraphsHtml(t.body, vars) + codeBox + footnote,
          unsubscribeUrl: data.unsubscribeUrl,
        }),
      };
    }
    case "newsletter_welcome": {
      const vars = {};
      return {
        subject: fillPlaceholders(t.subject, vars),
        html: layoutHtml({
          title: fillPlaceholders(t.title, vars),
          content:
            textToParagraphsHtml(t.body, vars) + (t.button.trim() ? buttonHtml(data.shopUrl, t.button) : ""),
          unsubscribeUrl: data.unsubscribeUrl,
        }),
      };
    }
  }
}

/** Datos de ejemplo para la vista previa del panel. */
export function sampleCustomerEmailData(key: CustomerEmailKey, siteUrl = "https://www.shennabrows.com"): CustomerEmailData {
  const order: OrderSummaryData = {
    orderRef: "2611140001",
    subtotal: 54.9,
    shipping: 4.9,
    total: 49.8,
    discountAmount: 10,
    discountCode: "BIENVENIDA10",
    lines: [
      { name: "Elixir Shenna Brows", quantity: 1, unitPrice: 29.9 },
      { name: "Lápiz de cejas — Soft Brown", quantity: 1, unitPrice: 25 },
    ],
    trackingCode: key === "order_paid" ? null : "PQ4F6P0712345670128001L",
  };
  const unsubscribeUrl = `${siteUrl}/baja`;
  switch (key) {
    case "order_paid":
    case "order_tracking":
    case "order_shipped":
      return { key, order };
    case "order_delivered":
      return {
        key,
        orderRef: order.orderRef,
        reviewUrl: `${siteUrl}/account#tu-experiencia`,
        instagramUrl: "https://www.instagram.com/shennabrows/",
      };
    case "order_cancelled":
      return { key, orderRef: "3f9a1c2e", total: order.total };
    case "welcome_discount":
      return {
        key,
        code: "BIENVENIDA10",
        discountLabel: formatEur(10),
        minSubtotal: 50,
        firstOrderOnly: true,
        unsubscribeUrl,
      };
    case "newsletter_welcome":
      return { key, shopUrl: `${siteUrl}/tienda`, unsubscribeUrl };
    default:
      return { key, orderRef: "3f9a1c2e", adminNote: null };
  }
}

/** Lee los textos guardados. Nunca falla: si algo va mal, salen los originales. */
export async function loadCustomerEmailOverrides(admin: {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
}): Promise<CustomerEmailOverrides> {
  try {
    const { data, error } = await admin
      .from("site_content")
      .select("content")
      .eq("key", CUSTOMER_EMAILS_CONTENT_KEY)
      .maybeSingle();
    if (error) {
      console.error("customer_emails_load", error);
      return {};
    }
    return parseCustomerEmailOverrides(data?.content ?? "");
  } catch (e) {
    console.error("customer_emails_load", e instanceof Error ? e.message : e);
    return {};
  }
}
