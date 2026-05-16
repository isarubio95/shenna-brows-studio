import { PDFDocument, StandardFonts, rgb, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";
import { Buffer } from "node:buffer";
import {
  buildRectificativeInvoiceNumber,
  buildSimplifiedInvoiceNumber,
  formatInvoiceDateEs,
} from "./invoiceHelpers.ts";

const businessLegalName = Deno.env.get("BUSINESS_LEGAL_NAME")?.trim() || "Shenna Brows Studio";
const businessTaxId = Deno.env.get("BUSINESS_TAX_ID")?.trim() || "PENDIENTE_NIF";
const businessAddressLine1 = Deno.env.get("BUSINESS_ADDRESS_LINE1")?.trim() || "Direccion pendiente";
const businessAddressLine2 = Deno.env.get("BUSINESS_ADDRESS_LINE2")?.trim() || "";
const businessCity = Deno.env.get("BUSINESS_ADDRESS_CITY")?.trim() || "Ciudad pendiente";
const businessCountry = Deno.env.get("BUSINESS_COUNTRY")?.trim() || "Espana";
const vatRatePercent = Number(Deno.env.get("TICKET_VAT_RATE_PERCENT") ?? "21");
const ticketLogoUrl = Deno.env.get("TICKET_LOGO_URL")?.trim() || "";

export type PurchaseTicketLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type GeneratePurchaseTicketArgs = {
  orderRef: string;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  lines: PurchaseTicketLine[];
  shippingAddress?: Record<string, string> | null;
  /** Fecha del ticket (p. ej. fecha del pedido). Por defecto: ahora. */
  issuedAt?: Date;
};

function normalizeEuros(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function formatSignedEuros(value: number): string {
  const n = normalizeEuros(value);
  const prefix = n < 0 ? "-" : "";
  return `${prefix}${Math.abs(n).toFixed(2)} EUR`;
}

async function drawLogo(pdf: PDFDocument, page: PDFPage, yStart: number): Promise<number> {
  let y = yStart;
  if (!ticketLogoUrl) return y;
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
      const logoH = image.height * ratio;
      page.drawImage(image, { x: 40, y: y - logoH + 10, width: maxW, height: logoH });
    }
  } catch {
    // Si el logo falla, no bloqueamos el documento.
  }
  return y;
}

export type GenerateRectificativeInvoiceArgs = {
  orderRef: string;
  email: string;
  originalIssuedAt: Date;
  issuedAt?: Date;
  reason: "cancelacion" | "devolucion";
  subtotal: number;
  shipping: number;
  total: number;
  lines: PurchaseTicketLine[];
  shippingAddress?: Record<string, string> | null;
  originalInvoiceNumber?: string;
};

export async function generateRectificativeInvoicePdfBase64(
  args: GenerateRectificativeInvoiceArgs,
): Promise<string> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.1, 0.12, 0.16);
  const mutedColor = rgb(0.35, 0.4, 0.46);
  let y = height - 50;

  await drawLogo(pdf, page, y);

  page.drawText("FACTURA RECTIFICATIVA", {
    x: 170,
    y,
    size: 16,
    font: fontBold,
    color: textColor,
  });
  y -= 28;

  const issuedAt = args.issuedAt ?? new Date();
  const originalIssuedAt = args.originalIssuedAt;
  const rectificativeNumber = buildRectificativeInvoiceNumber(args.orderRef, issuedAt);
  const originalNumber =
    args.originalInvoiceNumber ?? buildSimplifiedInvoiceNumber(args.orderRef, originalIssuedAt);
  const reasonText =
    args.reason === "cancelacion"
      ? "Anulacion / cancelacion del pedido y reembolso al cliente"
      : "Devolucion de bienes y reembolso al cliente";

  const headerLines = [
    businessLegalName,
    `NIF/CIF: ${businessTaxId}`,
    `${businessAddressLine1}${businessAddressLine2 ? `, ${businessAddressLine2}` : ""}`,
    `${businessCity}, ${businessCountry}`,
    `Factura rectificativa n.: ${rectificativeNumber}`,
    `Fecha de expedición: ${formatInvoiceDateEs(issuedAt)}`,
    `Factura rectificada: ${originalNumber}`,
    `Fecha factura rectificada: ${formatInvoiceDateEs(originalIssuedAt)}`,
    `Tipo rectificativa: R5 (factura simplificada rectificada)`,
    `Motivo: ${reasonText}`,
  ];
  for (const line of headerLines) {
    page.drawText(line, { x: 40, y, size: 10, font, color: mutedColor });
    y -= 14;
  }

  y -= 8;
  page.drawText(`Cliente / destinatario: ${args.email}`, { x: 40, y, size: 10, font, color: textColor });
  y -= 14;
  if (args.shippingAddress?.name) {
    page.drawText(`Referencia envío: ${args.shippingAddress.name}`, { x: 40, y, size: 10, font, color: textColor });
    y -= 14;
  }

  y -= 10;
  page.drawText("Concepto", { x: 40, y, size: 10, font: fontBold, color: textColor });
  page.drawText("Cant.", { x: 350, y, size: 10, font: fontBold, color: textColor });
  page.drawText("Importe", { x: 420, y, size: 10, font: fontBold, color: textColor });
  y -= 12;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 14;

  const sign = -1;
  for (const line of args.lines) {
    const lineTotal = normalizeEuros(line.quantity * line.unitPrice) * sign;
    const safeName = line.name.length > 44 ? `${line.name.slice(0, 41)}...` : line.name;
    page.drawText(safeName, { x: 40, y, size: 10, font, color: textColor });
    page.drawText(String(line.quantity), { x: 355, y, size: 10, font, color: textColor });
    page.drawText(formatSignedEuros(lineTotal), { x: 420, y, size: 10, font, color: textColor });
    y -= 16;
  }

  y -= 8;
  page.drawLine({ start: { x: 310, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 16;

  const grossTotal = normalizeEuros(args.total) * sign;
  const taxRate = Number.isFinite(vatRatePercent) && vatRatePercent > 0 ? vatRatePercent : 21;
  const taxableBase = normalizeEuros(grossTotal / (1 + taxRate / 100));
  const taxAmount = normalizeEuros(grossTotal - taxableBase);

  const totals: [string, number][] = [
    ["Subtotal productos", normalizeEuros(args.subtotal) * sign],
    ["Envío", normalizeEuros(args.shipping) * sign],
    ["Base imponible", taxableBase],
    [`IVA (${taxRate.toFixed(0)}%)`, taxAmount],
    ["TOTAL ABONO", grossTotal],
  ];
  for (const [label, value] of totals) {
    const isTotal = label === "TOTAL ABONO";
    page.drawText(label, { x: 310, y, size: isTotal ? 11 : 10, font: isTotal ? fontBold : font, color: textColor });
    page.drawText(formatSignedEuros(value), {
      x: 420,
      y,
      size: isTotal ? 11 : 10,
      font: isTotal ? fontBold : font,
      color: textColor,
    });
    y -= 16;
  }

  y -= 10;
  const legalNotes = [
    "Documento de abono emitido conforme al art. 14 del RD 1619/2012 (Reglamento de facturación).",
    "Rectifica la factura simplificada indicada. Importes con signo negativo = abono al cliente.",
    "Consérvese junto con la factura original para la contabilidad y la liquidación del IVA.",
  ];
  for (const note of legalNotes) {
    page.drawText(note, { x: 40, y, size: 9, font, color: mutedColor });
    y -= 12;
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}

export async function generatePurchaseTicketPdfBase64(
  args: GeneratePurchaseTicketArgs,
): Promise<string> {
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

  const issuedAt = args.issuedAt ?? new Date();
  const ticketNumber = buildSimplifiedInvoiceNumber(args.orderRef, issuedAt);

  const headerLines = [
    `${businessLegalName}`,
    `NIF/CIF: ${businessTaxId}`,
    `${businessAddressLine1}${businessAddressLine2 ? `, ${businessAddressLine2}` : ""}`,
    `${businessCity}, ${businessCountry}`,
    `Ticket: ${ticketNumber}`,
    `Fecha: ${formatInvoiceDateEs(issuedAt)}`,
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
