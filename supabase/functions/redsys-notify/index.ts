import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { Buffer } from "node:buffer";
import { decodeMerchantParameters, isMerchantSignatureValid } from "../_shared/redsys.ts";

const secretKey = Deno.env.get("REDSYS_SECRET_KEY")?.trim();
const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const resendFromAddress =
  Deno.env.get("RESEND_FROM_ADDRESS")?.trim() || "Shenna Brows <info@shennabrows.com>";
const resendApiUrl = "https://api.resend.com/emails";
const businessLegalName = Deno.env.get("BUSINESS_LEGAL_NAME")?.trim() || "Shenna Brows Studio";
const businessTaxId = Deno.env.get("BUSINESS_TAX_ID")?.trim() || "PENDIENTE_NIF";
const businessAddressLine1 = Deno.env.get("BUSINESS_ADDRESS_LINE1")?.trim() || "Direccion pendiente";
const businessAddressLine2 = Deno.env.get("BUSINESS_ADDRESS_LINE2")?.trim() || "";
const businessCity = Deno.env.get("BUSINESS_ADDRESS_CITY")?.trim() || "Ciudad pendiente";
const businessCountry = Deno.env.get("BUSINESS_COUNTRY")?.trim() || "Espana";
const vatRatePercent = Number(Deno.env.get("TICKET_VAT_RATE_PERCENT") ?? "21");
const ticketLogoUrl = Deno.env.get("TICKET_LOGO_URL")?.trim() || "";

type MerchantShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  phone?: string;
  country?: string;
};

type MerchantPayload = {
  email: string;
  lines: Array<{ productId: string; quantity: number }>;
  shippingEur: number;
  subtotalEur: number;
  shippingAddress?: MerchantShippingAddress;
  shipping_address?: MerchantShippingAddress;
};

function normalizeBase64(s: string): string {
  let t = s.trim().replace(/-/g, "+").replace(/_/g, "/");
  const rem = t.length % 4;
  if (rem !== 0) t += "=".repeat(4 - rem);
  return t;
}

function parseMerchantPayloadJson(json: string): MerchantPayload | null {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    const email = raw.email ?? raw.Email;
    const linesRaw = raw.lines ?? raw.Lines;
    const lines = Array.isArray(linesRaw)
      ? linesRaw.filter((x): x is { productId?: string; quantity?: number } => x != null && typeof x === "object")
      : [];
    const normalizedLines = lines
      .map((x) => ({
        productId: String(x.productId ?? (x as Record<string, unknown>).product_id ?? ""),
        quantity: Math.floor(Number(x.quantity) || 0),
      }))
      .filter((x) => x.productId && x.quantity > 0);
    if (typeof email !== "string" || !email.trim() || !normalizedLines.length) return null;
    return {
      email: String(email).trim().toLowerCase(),
      lines: normalizedLines,
      shippingEur: Number(raw.shippingEur ?? 0),
      subtotalEur: Number(raw.subtotalEur ?? 0),
      shippingAddress: (raw.shippingAddress ?? raw.shipping_address) as MerchantShippingAddress | undefined,
      shipping_address: (raw.shipping_address ?? raw.shippingAddress) as MerchantShippingAddress | undefined,
    };
  } catch {
    return null;
  }
}

function decodeMerchantDataB64(b64: string): MerchantPayload | null {
  const attempts = [b64.trim(), normalizeBase64(b64)];
  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      const json = Buffer.from(candidate, "base64").toString("utf8");
      const parsed = parseMerchantPayloadJson(json);
      if (parsed?.email && parsed.lines?.length) return parsed;
    } catch {
      /* siguiente intento */
    }
  }
  return null;
}

type PendingOrderRow = {
  email?: string | null;
  subtotal?: unknown;
  shipping?: unknown;
  shipping_address?: unknown;
  pending_cart_snapshot?: unknown;
};

function payloadFromPendingRow(row: PendingOrderRow): MerchantPayload | null {
  const snap = row.pending_cart_snapshot as { lines?: Array<{ productId?: unknown; quantity?: unknown }> } | null;
  const rawLines = snap?.lines;
  const email = row.email != null ? String(row.email).trim().toLowerCase() : "";
  if (!email || !Array.isArray(rawLines) || !rawLines.length) return null;
  const lines = rawLines
    .map((l) => ({
      productId: String(l?.productId ?? ""),
      quantity: Math.floor(Number(l?.quantity) || 0),
    }))
    .filter((l) => l.productId && l.quantity > 0);
  if (!lines.length) return null;
  return {
    email,
    lines,
    subtotalEur: Number(row.subtotal ?? 0),
    shippingEur: Number(row.shipping ?? 0),
    shipping_address: row.shipping_address as MerchantShippingAddress | undefined,
  };
}

function extractMerchantDataB64(decoded: Record<string, unknown>): string {
  const directKeys = [
    "Ds_MerchantData",
    "DS_MERCHANTDATA",
    "Ds_Merchant_MerchantData",
    "DS_MERCHANT_MERCHANTDATA",
    "ds_merchantdata",
    "ds_merchant_merchantdata",
  ];
  for (const k of directKeys) {
    const v = decoded[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [k, v] of Object.entries(decoded)) {
    if (typeof v !== "string" || !v.trim()) continue;
    const lower = k.toLowerCase();
    if (lower.includes("merchantdata") && lower.includes("merchant")) return v.trim();
    if (lower === "ds_merchantdata") return v.trim();
  }
  return "";
}

function shippingAddressFromPayload(a: MerchantShippingAddress | undefined): Record<string, string> | null {
  if (!a || typeof a !== "object") return null;
  const name = pick(a as Record<string, unknown>, ["name"]);
  const line1 = pick(a as Record<string, unknown>, ["line1", "address"]);
  const postal_code = pick(a as Record<string, unknown>, ["postal_code", "cp", "zip"]);
  const city = pick(a as Record<string, unknown>, ["city", "locality"]);
  const province = pick(a as Record<string, unknown>, ["province", "state"]);
  const phone = pick(a as Record<string, unknown>, ["phone", "phoneNumber"]);
  if (!name || !line1 || !postal_code || !city || !province || !phone) return null;
  const line2 = pick(a as Record<string, unknown>, ["line2"]);
  const country = pick(a as Record<string, unknown>, ["country"]) || "ESP";
  return { name, line1, line2, postal_code, city, province, phone, country };
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v) !== "") return String(v);
  }
  return "";
}

function normalizeEuros(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

async function generatePurchaseTicketPdf(args: {
  orderRef: string;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  lines: Array<{ name: string; quantity: number; unitPrice: number }>;
  shippingAddress?: Record<string, string> | null;
}): Promise<string> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.1, 0.12, 0.16);
  const mutedColor = rgb(0.35, 0.4, 0.46);
  let y = height - 50;

  if (ticketLogoUrl) {
    try {
      const logoResp = await fetch(ticketLogoUrl);
      if (logoResp.ok) {
        const logoBytes = await logoResp.arrayBuffer();
        const ct = (logoResp.headers.get("content-type") || "").toLowerCase();
        const image = ct.includes("png")
          ? await pdf.embedPng(logoBytes)
          : await pdf.embedJpg(logoBytes);
        const maxW = 120;
        const ratio = maxW / image.width;
        const logoW = maxW;
        const logoH = image.height * ratio;
        page.drawImage(image, { x: 40, y: y - logoH + 10, width: logoW, height: logoH });
      }
    } catch {
      // Si el logo falla, no bloqueamos el ticket.
    }
  }

  page.drawText("TICKET / FACTURA SIMPLIFICADA", {
    x: 180,
    y,
    size: 16,
    font: fontBold,
    color: textColor,
  });
  y -= 28;

  const now = new Date();
  const dateIso = now.toISOString().slice(0, 10);
  const ticketNumber = `T-${dateIso.replaceAll("-", "")}-${args.orderRef}`;

  const headerLines = [
    `${businessLegalName}`,
    `NIF/CIF: ${businessTaxId}`,
    `${businessAddressLine1}${businessAddressLine2 ? `, ${businessAddressLine2}` : ""}`,
    `${businessCity}, ${businessCountry}`,
    `Ticket: ${ticketNumber}`,
    `Fecha: ${dateIso}`,
  ];
  for (const line of headerLines) {
    page.drawText(line, { x: 40, y, size: 10, font, color: mutedColor });
    y -= 14;
  }

  y -= 8;
  page.drawText(`Cliente: ${args.email}`, { x: 40, y, size: 10, font, color: textColor });
  y -= 14;
  if (args.shippingAddress?.name) {
    page.drawText(`Envio a: ${args.shippingAddress.name}`, { x: 40, y, size: 10, font, color: textColor });
    y -= 14;
  }

  y -= 10;
  page.drawText("Concepto", { x: 40, y, size: 10, font: fontBold, color: textColor });
  page.drawText("Cant.", { x: 350, y, size: 10, font: fontBold, color: textColor });
  page.drawText("Importe", { x: 430, y, size: 10, font: fontBold, color: textColor });
  y -= 12;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 14;

  for (const line of args.lines) {
    const lineTotal = normalizeEuros(line.quantity * line.unitPrice);
    const safeName = line.name.length > 48 ? `${line.name.slice(0, 45)}...` : line.name;
    page.drawText(safeName, { x: 40, y, size: 10, font, color: textColor });
    page.drawText(String(line.quantity), { x: 355, y, size: 10, font, color: textColor });
    page.drawText(`${lineTotal.toFixed(2)} EUR`, { x: 430, y, size: 10, font, color: textColor });
    y -= 16;
  }

  y -= 8;
  page.drawLine({ start: { x: 310, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 16;

  const grossTotal = normalizeEuros(args.total);
  const taxRate = Number.isFinite(vatRatePercent) && vatRatePercent > 0 ? vatRatePercent : 21;
  const taxableBase = normalizeEuros(grossTotal / (1 + taxRate / 100));
  const taxAmount = normalizeEuros(grossTotal - taxableBase);

  const totals = [
    ["Subtotal productos", normalizeEuros(args.subtotal)],
    ["Envio", normalizeEuros(args.shipping)],
    [`Base imponible`, taxableBase],
    [`IVA (${taxRate.toFixed(0)}%)`, taxAmount],
    ["TOTAL", grossTotal],
  ];
  for (const [label, value] of totals) {
    const isTotal = label === "TOTAL";
    page.drawText(label, { x: 310, y, size: isTotal ? 11 : 10, font: isTotal ? fontBold : font, color: textColor });
    page.drawText(`${Number(value).toFixed(2)} EUR`, {
      x: 430,
      y,
      size: isTotal ? 11 : 10,
      font: isTotal ? fontBold : font,
      color: textColor,
    });
    y -= 16;
  }

  y -= 10;
  page.drawText(
    "Documento generado automaticamente para justificar la compra. Conserva este ticket para tus registros.",
    { x: 40, y, size: 9, font, color: mutedColor },
  );

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}

async function sendOrderConfirmationEmail(args: {
  email: string;
  orderRef: string;
  subtotal: number;
  shipping: number;
  total: number;
  lines: Array<{ name: string; quantity: number; unitPrice: number }>;
  shippingAddress?: Record<string, string> | null;
}) {
  if (!resendApiKey) {
    console.warn("redsys_notify_resend_not_configured");
    return;
  }

  const formatEur = (value: number) =>
    Number(value || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

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

  const html = `
    <div style="background: #f8fafc; padding: 24px 12px; font-family: Arial, sans-serif; color: #1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
        <tr>
          <td style="padding: 24px; background: #111827; color: #ffffff;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.85;">Shenna Brows Studio</p>
            <h2 style="margin: 8px 0 0; font-size: 24px; line-height: 1.25;">Pago confirmado</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.5; color: #334155;">
              Gracias por tu pedido. Hemos recibido el pago correctamente y ya estamos preparando tu compra.
            </p>
            <p style="margin: 0 0 18px; font-size: 14px; color: #475569;">
              <strong>Referencia del pedido:</strong> ${escapeHtml(args.orderRef)}
            </p>
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

  let ticketPdfBase64: string | null = null;
  try {
    ticketPdfBase64 = await generatePurchaseTicketPdf({
      orderRef: args.orderRef,
      email: args.email,
      subtotal: args.subtotal,
      shipping: args.shipping,
      total: args.total,
      lines: args.lines,
      shippingAddress: args.shippingAddress ?? null,
    });
  } catch (e) {
    console.error("redsys_notify_ticket_pdf_error", e instanceof Error ? e.message : e);
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromAddress,
      to: [args.email],
      subject: "Confirmacion de pedido - Shenna Brows Studio",
      html,
      ...(ticketPdfBase64
        ? {
            attachments: [
              {
                filename: `ticket-${args.orderRef}.pdf`,
                content: ticketPdfBase64,
                content_type: "application/pdf",
              },
            ],
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const resendErr = await response.text();
    console.error("redsys_notify_resend_error", resendErr);
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!secretKey || !supabaseUrl || !serviceKey) {
    console.error("redsys_notify_misconfigured");
    return new Response("Misconfigured", { status: 500 });
  }

  try {
    const form = await req.formData();
    const dsMerchantParameters = String(form.get("Ds_MerchantParameters") ?? form.get("Ds_MERCHANTPARAMETERS") ?? "");
    const dsSignature = String(form.get("Ds_Signature") ?? form.get("Ds_SIGNATURE") ?? "");

    if (!dsMerchantParameters || !dsSignature) {
      console.warn("redsys_notify_missing_fields");
      return new Response("Bad Request", { status: 400 });
    }

    if (!isMerchantSignatureValid(dsSignature, secretKey, dsMerchantParameters)) {
      console.warn("redsys_notify_bad_signature");
      return new Response("Invalid signature", { status: 400 });
    }

    const decoded = decodeMerchantParameters<Record<string, unknown>>(dsMerchantParameters);
    const dsResponse = pick(decoded, ["Ds_Response", "DS_RESPONSE"]).trim();
    // Redsys: 0000–0099 = autorizada (no basta con === 0: p. ej. "0045" es éxito).
    const responseNum = parseInt(dsResponse, 10);
    const authorized = !Number.isNaN(responseNum) && responseNum >= 0 && responseNum <= 99;
    if (!authorized) {
      console.log("redsys_notify_declined", { dsResponse });
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const dsOrder = pick(decoded, ["Ds_Order", "DS_ORDER"]);
    if (!dsOrder) {
      console.warn("redsys_notify_missing_order_or_data");
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const merchantDataB64 = extractMerchantDataB64(decoded) || pick(decoded, [
      "Ds_MerchantData",
      "DS_MERCHANTDATA",
      "Ds_Merchant_MerchantData",
      "DS_MERCHANT_MERCHANTDATA",
    ]);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await admin
      .from("orders")
      .select("id, status, shipping_address, email, subtotal, shipping, total, pending_cart_snapshot")
      .eq("stripe_session_id", dsOrder)
      .maybeSingle();

    let payload: MerchantPayload | null = merchantDataB64 ? decodeMerchantDataB64(merchantDataB64) : null;

    if ((!payload?.email || !payload.lines?.length) && existing && String(existing.status) === "pending_payment") {
      const fromDb = payloadFromPendingRow(existing as PendingOrderRow);
      if (fromDb) {
        console.log("redsys_notify_payload_from_snapshot");
        payload = fromDb;
      }
    }

    if (!payload?.email || !payload.lines?.length) {
      console.warn("redsys_notify_bad_merchant_payload");
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const subtotal = Number(payload.subtotalEur);
    const shipping = Number(payload.shippingEur);
    const total = subtotal + shipping;
    const shipFromPayload = shippingAddressFromPayload(
      payload.shippingAddress ?? payload.shipping_address,
    );

    const shippingFromRow = (row: unknown): Record<string, string> | null => {
      if (!row || typeof row !== "object") return null;
      return shippingAddressFromPayload(row as MerchantShippingAddress);
    };

    const resolvedShipping =
      shipFromPayload ?? shippingFromRow(existing?.shipping_address ?? null);

    const productIds = payload.lines.map((l) => l.productId);
    const { data: products } = await admin.from("products").select("id, name, price").in("id", productIds);
    const priceById = new Map<string, number>(
      (products ?? []).map((p) => [String(p.id), Number(p.price)]),
    );
    const nameById = new Map<string, string>(
      (products ?? []).map((p) => [String(p.id), String(p.name ?? "Producto")]),
    );

    const buildOrderItems = (orderId: string) =>
      payload.lines.map((line) => {
        const unit = priceById.get(String(line.productId)) ?? 0;
        const name = nameById.get(String(line.productId)) ?? "Producto";
        return {
          order_id: orderId,
          product_id: line.productId,
          product_name: String(name),
          quantity: line.quantity,
          unit_price: unit,
        };
      });

    const buildEmailLines = () =>
      payload.lines.map((line) => {
        const unitPrice = priceById.get(String(line.productId)) ?? 0;
        const name = nameById.get(String(line.productId)) ?? "Producto";
        return { name, quantity: line.quantity, unitPrice };
      });

    if (existing?.id) {
      const status = String(existing.status ?? "");
      if (status === "pending_payment") {
        const keepAddress = resolvedShipping ?? shippingFromRow(existing.shipping_address);
        const { data: updated, error: upErr } = await admin
          .from("orders")
          .update({
            status: "paid",
            email: payload.email,
            subtotal,
            shipping,
            total,
            shipping_address: keepAddress ?? existing.shipping_address,
            pending_cart_snapshot: null,
          })
          .eq("id", existing.id)
          .eq("status", "pending_payment")
          .select("id");

        if (upErr) {
          console.error("redsys_notify_pending_update", upErr);
        } else if (updated?.length) {
          const orderItems = buildOrderItems(existing.id as string);
          const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
          if (itemsErr) {
            console.error("redsys_notify_order_items", itemsErr);
          }
          await sendOrderConfirmationEmail({
            email: payload.email,
            orderRef: dsOrder,
            subtotal,
            shipping,
            total,
            lines: buildEmailLines(),
            shippingAddress: keepAddress,
          });
        } else {
          const { data: fresh } = await admin.from("orders").select("status").eq("id", existing.id).maybeSingle();
          if (fresh?.status === "paid") {
            const { count: itemCount } = await admin
              .from("order_items")
              .select("id", { count: "exact", head: true })
              .eq("order_id", existing.id);
            if (!itemCount) {
              const orderItems = buildOrderItems(existing.id as string);
              const { error: itemsErr2 } = await admin.from("order_items").insert(orderItems);
              if (itemsErr2) console.error("redsys_notify_order_items_retry", itemsErr2);
            }
          }
        }
        return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const shipping_address = resolvedShipping;

    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        email: payload.email,
        status: "paid",
        subtotal,
        shipping,
        total,
        stripe_session_id: dsOrder,
        shipping_address,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow?.id) {
      console.error("redsys_notify_order_insert", orderErr);
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const orderId = orderRow.id as string;
    const orderItems = buildOrderItems(orderId);

    const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
    if (itemsErr) {
      console.error("redsys_notify_order_items", itemsErr);
    }
    await sendOrderConfirmationEmail({
      email: payload.email,
      orderRef: dsOrder,
      subtotal,
      shipping,
      total,
      lines: buildEmailLines(),
      shippingAddress: shipping_address,
    });

    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (e) {
    console.error("redsys_notify_error", e instanceof Error ? e.message : e);
    return new Response("Error", { status: 500 });
  }
});
