import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import AnimatedSection from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, FileDown, Loader2, Package, Pencil, Plus, Printer, Trash2, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ProductEditDialog from "@/components/admin/ProductEditDialog";
import AdminContentEditor from "@/components/admin/AdminContentEditor";
import AdminEmailSender from "@/components/admin/AdminEmailSender";
import AdminThemeEditor from "@/components/admin/AdminThemeEditor";
import AdminStockManager from "@/components/admin/AdminStockManager";
import AdminReturnsManager from "@/components/admin/AdminReturnsManager";
import {
  getOrderReturnDisplay,
  pickLatestReturnRequest,
  returnStatusBlocksFulfillment,
  type ReturnRequestStatus,
} from "@/lib/returns";
import { getProductImageUrl } from "@/lib/product-images";
import { parseColorVariants, type ColorVariant } from "@/lib/color-variants";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const PAID_ORDER_STATUSES = new Set(["paid", "shipped", "delivered"]);
const PENDING_ORDER_STATUSES = new Set(["pending", "pending_payment"]);

function canPrintShippingLabel(orderStatus: string): boolean {
  return !PENDING_ORDER_STATUSES.has(orderStatus) && orderStatus !== "cancelled";
}

const PRODUCT_VARIANT_SEPS = [" — ", " – ", " - "] as const;

const parseProductLineName = (productName: string): { name: string; variant: string | null } => {
  for (const sep of PRODUCT_VARIANT_SEPS) {
    const idx = productName.lastIndexOf(sep);
    if (idx === -1) continue;
    const variant = productName.slice(idx + sep.length).trim();
    return {
      name: productName.slice(0, idx).trim(),
      variant: variant || null,
    };
  }
  return { name: productName, variant: null };
};

type ProductCatalogEntry = {
  name: string;
  variants: ColorVariant[];
};

const resolveVariantForLine = (
  line: Record<string, unknown>,
  variantFromName: string | null,
  productCatalogById: Map<string, ProductCatalogEntry>,
): { name: string | null; hex: string | null } => {
  const explicitName = readStringField(line, [
    "variantName",
    "variant_name",
    "colorVariantName",
    "color_variant_name",
  ]);
  if (explicitName) {
    const productId = readStringField(line, ["productId", "product_id"]);
    const variantId = readStringField(line, ["colorVariantId", "color_variant_id", "variantId", "variant_id"]);
    const hex =
      productId && variantId
        ? productCatalogById.get(productId)?.variants.find((v) => v.id === variantId)?.hex ?? null
        : null;
    return { name: explicitName, hex };
  }

  if (variantFromName) return { name: variantFromName, hex: null };

  const variantId = readStringField(line, ["colorVariantId", "color_variant_id", "variantId", "variant_id"]);
  const productId = readStringField(line, ["productId", "product_id"]);
  if (!variantId || !productId) return { name: null, hex: null };

  const chosen = productCatalogById.get(productId)?.variants.find((v) => v.id === variantId);
  return chosen ? { name: chosen.name, hex: chosen.hex } : { name: null, hex: null };
};

const formatShippingAddressLines = (addr: unknown): string[] => {
  if (!addr || typeof addr !== "object") return [];
  const raw = addr as Record<string, unknown>;
  const lines: string[] = [];
  const name = readStringField(raw, ["name", "full_name", "fullName", "recipient", "recipient_name"]);
  const line1 = readStringField(raw, ["line1", "address", "street", "address1"]);
  const line2 = readStringField(raw, ["line2", "address2"]);
  const city = readStringField(raw, ["city", "locality", "town"]);
  const province = readStringField(raw, ["province", "state", "region"]);
  const postal = readStringField(raw, ["postal_code", "zip", "cp", "postcode"]);
  const phone = readStringField(raw, ["phone", "contactPhone", "phoneNumber"]);
  const country = readStringField(raw, ["country", "country_code"]);
  if (name) lines.push(name);
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);
  const cityLine = [postal, city, province].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (phone) lines.push(`Tel: ${phone}`);
  if (country && !["ES", "ESP", "724", "SPAIN"].includes(country.toUpperCase())) {
    lines.push(country);
  }
  return lines;
};

type DisplayOrderLine = {
  name: string;
  variant: string | null;
  variantHex: string | null;
  quantity: number;
  unitPrice: number | null;
};

const parsePendingCartSnapshot = (raw: unknown): { lines?: Array<Record<string, unknown>> } | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as { lines?: Array<Record<string, unknown>> })
        : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as { lines?: Array<Record<string, unknown>> };
  return null;
};

const resolveLineDisplayName = (
  line: Record<string, unknown>,
  productNameById: Map<string, string>,
): string => {
  const fromFields = readStringField(line, [
    "productDisplayName",
    "product_display_name",
    "name",
    "productName",
    "product_name",
    "displayName",
    "display_name",
  ]);
  if (fromFields) return fromFields;

  const productId = readStringField(line, ["productId", "product_id"]);
  if (productId) {
    const catalogName = productNameById.get(productId);
    if (catalogName) return catalogName;
  }

  return "Producto";
};

const resolveOrderItemDisplayName = (
  item: Record<string, unknown>,
  productNameById: Map<string, string>,
): string => {
  const stored = readStringField(item, ["product_name", "productName"]);
  if (stored && stored !== "Producto") return stored;

  const productId = readStringField(item, ["product_id", "productId"]);
  if (productId) {
    const catalogName = productNameById.get(productId);
    if (catalogName) return catalogName;
  }

  return stored || "Producto";
};

const toDisplayOrderLine = (
  line: Record<string, unknown>,
  display: string,
  productCatalogById: Map<string, ProductCatalogEntry>,
  quantity: number,
  unitPrice: number | null,
): DisplayOrderLine => {
  const { name, variant: variantFromName } = parseProductLineName(display);
  const resolved = resolveVariantForLine(line, variantFromName, productCatalogById);
  return {
    name,
    variant: resolved.name ?? variantFromName,
    variantHex: resolved.hex,
    quantity,
    unitPrice,
  };
};

const mapSnapshotLines = (
  snap: { lines?: Array<Record<string, unknown>> },
  productNameById: Map<string, string>,
  productCatalogById: Map<string, ProductCatalogEntry>,
): DisplayOrderLine[] =>
  (snap.lines ?? []).map((line) => {
    const display = resolveLineDisplayName(line, productNameById);
    const unitPriceRaw = line.unitPrice ?? line.unit_price;
    return toDisplayOrderLine(
      line,
      display,
      productCatalogById,
      Number(line.quantity) || 1,
      unitPriceRaw != null ? Number(unitPriceRaw) : null,
    );
  });

const getDisplayOrderLines = (
  order: Record<string, unknown>,
  items: unknown[] | undefined,
  productNameById: Map<string, string>,
  productCatalogById: Map<string, ProductCatalogEntry>,
): DisplayOrderLine[] => {
  const status = String(order.status ?? "");
  const snap = parsePendingCartSnapshot(order.pending_cart_snapshot);
  const isPending = status === "pending_payment" || status === "pending";

  if (isPending && snap?.lines?.length) {
    return mapSnapshotLines(snap, productNameById, productCatalogById);
  }

  if (items && items.length > 0) {
    return items.map((raw) => {
      const item = raw as Record<string, unknown>;
      const display = resolveOrderItemDisplayName(item, productNameById);
      return toDisplayOrderLine(
        item,
        display,
        productCatalogById,
        Number(item.quantity) || 1,
        item.unit_price != null ? Number(item.unit_price) : null,
      );
    });
  }

  if (snap?.lines?.length) {
    return mapSnapshotLines(snap, productNameById, productCatalogById);
  }
  return [];
};

const getEnvNumber = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readStringField = (obj: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const s = String(value);
      if (s.length > 0) return s;
    }
  }
  return null;
};

/** CP nacional (5 dígitos) a partir del valor introducido en checkout. */
const normalizeSpainPostalCode = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : "";
};

const isSpainCountryCode = (raw: string): boolean => {
  const u = raw.trim().toUpperCase();
  return u === "" || u === "ES" || u === "ESP" || u === "724" || u === "SPAIN";
};

/**
 * Preregister Correos (tabla provincias): código de 2 dígitos alineado con el CP, no el nombre literal.
 * Errores típicos 1046 / 1115 si se envía "Madrid" en lugar de "28".
 */
const correosIneProvinceFromSpanishCp = (postal5: string): string | null => {
  if (postal5.length !== 5 || !/^\d{5}$/.test(postal5)) return null;
  return postal5.slice(0, 2);
};

const SHIPMENT_CODE_KEYS = [
  "correos_shipment_code",
  "correosShipmentCode",
  "shipment_code",
  "shipmentCode",
  "shipment",
  "tracking_code",
  "trackingCode",
  "tracking_number",
  "trackingNumber",
  "packageCode",
  "package_code",
  "cod_envio",
  "codEnvio",
  "codExpedicion",
];

const extractShipmentCodeFromXml = (raw: string): string | null => {
  const codEnvioMatch = raw.match(/<CodEnvio>\s*([^<]+)\s*<\/CodEnvio>/i);
  if (codEnvioMatch?.[1]) return codEnvioMatch[1].trim();
  const codExpedicionMatch = raw.match(/<CodExpedicion>\s*([^<]+)\s*<\/CodExpedicion>/i);
  if (codExpedicionMatch?.[1]) return codExpedicionMatch[1].trim();
  return null;
};

const extractShipmentCodeFromPayload = (payload: unknown): string | null => {
  if (!payload) return null;

  if (typeof payload === "string") {
    const fromXml = extractShipmentCodeFromXml(payload);
    if (fromXml) return fromXml;
    if (/^[A-Z0-9]{12,}$/i.test(payload.trim())) return payload.trim();
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const code = extractShipmentCodeFromPayload(item);
      if (code) return code;
    }
    return null;
  }

  if (typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    const directCode = readStringField(data, [...SHIPMENT_CODE_KEYS, "codExpedicion", "CodEnvio", "CodExpedicion"]);
    if (directCode) return directCode;

    const xml = data.xml;
    if (typeof xml === "string") {
      const fromXml = extractShipmentCodeFromXml(xml);
      if (fromXml) return fromXml;
    }

    for (const value of Object.values(data)) {
      const nestedCode = extractShipmentCodeFromPayload(value);
      if (nestedCode) return nestedCode;
    }
  }

  return null;
};

/**
 * Códigos para impresión de etiquetas: Correos suele exigir packageCode (bulto) alineado con el oid del JWT.
 * Multibulto: un código por paquete en el mismo orden que en preregister.
 */
const extractCorreosLabelPrintCodes = (payload: unknown): string[] => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;
  const shipments = data.shipments;
  if (!Array.isArray(shipments) || shipments.length === 0) return [];
  const codes: string[] = [];
  for (const item of shipments) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const packages = row.packages;
    if (Array.isArray(packages)) {
      for (const pkg of packages) {
        if (!pkg || typeof pkg !== "object") continue;
        const packageCode = readStringField(pkg as Record<string, unknown>, ["packageCode", "package_code"]);
        if (packageCode) codes.push(packageCode);
      }
    }
  }
  if (codes.length > 0) return codes;
  for (const item of shipments) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const shipmentCode = readStringField(row, ["shipmentCode", "shipment_code", "expeditionCode", "codExpedicion"]);
    if (shipmentCode) return [shipmentCode];
  }
  return [];
};

/** Códigos de expedición (un por envío en shipments[]), para impresión cuando packageCode falla por oid/eid. */
const extractCorreosExpeditionPrintCodes = (payload: unknown): string[] => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;
  const shipments = data.shipments;
  if (!Array.isArray(shipments) || shipments.length === 0) return [];
  const out: string[] = [];
  for (const item of shipments) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const sc = readStringField(row, ["shipmentCode", "shipment_code", "expeditionCode", "codExpedicion"]);
    if (sc) out.push(sc);
  }
  return out;
};

const isCorreosLabelsOidError = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const d = payload as Record<string, unknown>;
  const more = d.moreInformation as Record<string, unknown> | undefined;
  const msg =
    (more && typeof more.errorMessage === "string" && more.errorMessage) ||
    (more && typeof more.description === "string" && more.description) ||
    "";
  return (
    (d.code === "404" || d.code === 404 || d.message === "Not Found") &&
    /oid|eid|pertenecen/i.test(String(msg))
  );
};

/** Un solo código para guardar en BD (preferimos primer packageCode). */
const extractCorreosPreregisterCode = (payload: unknown): string | null => {
  const list = extractCorreosLabelPrintCodes(payload);
  if (list.length > 0) return list[0];
  return extractShipmentCodeFromPayload(payload);
};

const describeCorreosPreregisterFailure = (payload: unknown): string => {
  if (payload == null) return "Sin cuerpo de respuesta.";
  if (typeof payload === "string") {
    return payload.length > 280 ? `${payload.slice(0, 280)}…` : payload;
  }
  if (typeof payload !== "object") return String(payload);
  const d = payload as Record<string, unknown>;
  if (typeof d.qrCode === "string" && d.qrCode.length > 0 && !Array.isArray(d.shipments)) {
    return "La API devolvió solo qrCode (no el JSON de preregistro con shipments). En Supabase, revisa CORREOS_API_BASE_URL: debe ser la base de admissions en PRO, p. ej. https://api1.correos.es/admissions (sin 'pre'). La URL final debe ser …/admissions/preregister/api/v1/delivery.";
  }
  const result = d.result;
  if (result === "0" || result === 0) {
    const shipments = d.shipments;
    if (Array.isArray(shipments)) {
      const lines: string[] = [];
      for (const s of shipments) {
        if (!s || typeof s !== "object") continue;
        const errs = (s as Record<string, unknown>).error;
        if (!Array.isArray(errs)) continue;
        for (const e of errs) {
          if (!e || typeof e !== "object") continue;
          const rec = e as Record<string, unknown>;
          const desc = typeof rec.description === "string" ? rec.description : "";
          const field = typeof rec.errorFieldName === "string" ? rec.errorFieldName : "";
          const code = rec.errorCode;
          if (desc) {
            const suffix = code != null && code !== "" ? ` (${code})` : "";
            lines.push(field ? `${field}: ${desc}${suffix}` : `${desc}${suffix}`);
          }
        }
      }
      if (lines.length > 0) {
        return `Correos rechazó el envío: ${lines.join(" · ")}`;
      }
    }
    return `result=0 (validación). Revisa el cuerpo devuelto por Correos: ${JSON.stringify(d).slice(0, 500)}`;
  }
  return JSON.stringify(d).slice(0, 400);
};

const stringFrom = (obj: Record<string, unknown>, keys: string[], fallback = ""): string => {
  const value = readStringField(obj, keys);
  return value ?? fallback;
};

const toNumericText = (value: unknown, fallback = "0"): string => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value).toString();
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").trim();
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return Math.round(parsed).toString();
  }
  return fallback;
};

/**
 * Correos valida smsNumber de forma estricta (p.ej. error 1032):
 * - España: 9 dígitos nacionales (sin +34 ni espacios).
 * - Internacional: solo dígitos (máx. 15), sin prefijo '+'.
 */
const normalizeCorreosSmsNumber = (raw: string, countryCode: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (isSpainCountryCode(countryCode)) {
    if (digits.length === 9) return digits;
    if (digits.length === 11 && digits.startsWith("34")) return digits.slice(2);
    return "";
  }

  return digits.length >= 6 && digits.length <= 15 ? digits : "";
};

const buildCorreosPreregisterBody = (order: any) => {
  const orderRecord = (order && typeof order === "object" ? order : {}) as Record<string, unknown>;
  const rawAddress =
    orderRecord.shipping_address && typeof orderRecord.shipping_address === "object"
      ? (orderRecord.shipping_address as Record<string, unknown>)
      : {};

  const fullName = stringFrom(rawAddress, ["name", "full_name", "fullName", "recipient", "recipient_name"]);
  const [name = "Cliente", lastName1 = "Web"] = fullName
    .split(" ")
    .filter(Boolean)
    .length > 0
    ? fullName.split(" ").filter(Boolean)
    : ["Cliente", "Web"];

  const countryRaw = stringFrom(rawAddress, ["country", "country_code"], "ESP").toUpperCase();
  const countryForApi = countryRaw === "ES" ? "ESP" : countryRaw || "ESP";
  const spanishDestination = isSpainCountryCode(countryForApi);
  const cpRaw = stringFrom(rawAddress, ["postal_code", "zip", "cp", "postcode"], "");
  const cpSpain = spanishDestination ? normalizeSpainPostalCode(cpRaw) : "";
  const cpForAddressee =
    spanishDestination && cpSpain ? cpSpain : stringFrom(rawAddress, ["postal_code", "zip", "cp", "postcode"], "");

  const userProvince = stringFrom(
    rawAddress,
    ["province_code", "provinceCode", "province", "state_code", "state", "region"],
    (import.meta.env.VITE_CORREOS_DEFAULT_ADDRESSEE_PROVINCE as string | undefined)?.trim() || ""
  );
  let provinceForCorreos = userProvince;
  if (spanishDestination) {
    const fromCp = cpSpain ? correosIneProvinceFromSpanishCp(cpSpain) : null;
    if (fromCp) provinceForCorreos = fromCp;
    else {
      const digitsOnly = userProvince.replace(/\D/g, "");
      if (digitsOnly.length === 1) provinceForCorreos = digitsOnly.padStart(2, "0");
      else if (digitsOnly.length === 2) provinceForCorreos = digitsOnly;
    }
  }
  const normalizedAddresseeSms = normalizeCorreosSmsNumber(
    stringFrom(rawAddress, ["phone", "smsNumber", "contactPhone"], ""),
    countryForApi
  );

  const addressee = {
    address: stringFrom(rawAddress, ["line1", "address", "street", "address1"], "Sin direccion"),
    addressComplement: stringFrom(rawAddress, ["line2", "address2", "address_complement"], ""),
    addressType: (import.meta.env.VITE_CORREOS_ADDRESSEE_ADDRESS_TYPE as string | undefined)?.trim() || "CL",
    block: stringFrom(rawAddress, ["block"], ""),
    company: stringFrom(rawAddress, ["company"], ""),
    contactPerson: fullName || name,
    contactPhone: stringFrom(rawAddress, ["phone", "contactPhone", "phoneNumber"], ""),
    country: countryForApi,
    cp: cpForAddressee,
    doiNumber: stringFrom(rawAddress, ["doiNumber", "dni", "nif"], ""),
    doiType: stringFrom(rawAddress, ["doiType"], "1"),
    door: stringFrom(rawAddress, ["door"], ""),
    email: stringFrom(orderRecord, ["email"], ""),
    floor: stringFrom(rawAddress, ["floor"], ""),
    language: "spa",
    lastName1,
    lastName2: stringFrom(rawAddress, ["lastName2", "last_name2", "surname2"], ""),
    locality: stringFrom(rawAddress, ["city", "locality", "town"], ""),
    name,
    number: stringFrom(rawAddress, ["number", "street_number"], ""),
    portal: stringFrom(rawAddress, ["portal"], ""),
    province: provinceForCorreos,
    smsNumber: normalizedAddresseeSms,
    staircase: stringFrom(rawAddress, ["staircase"], ""),
    zip: "",
  };

  const senderName = (import.meta.env.VITE_CORREOS_SENDER_NAME as string | undefined)?.trim() || "Shenna Brows";
  const [senderFirstName = "Shenna", senderLastName1 = "Brows"] = senderName.split(" ").filter(Boolean);
  const sender = {
    address: (import.meta.env.VITE_CORREOS_SENDER_ADDRESS as string | undefined)?.trim() || "Direccion remitente",
    addressComplement: (import.meta.env.VITE_CORREOS_SENDER_ADDRESS_COMPLEMENT as string | undefined)?.trim() || "",
    addressType: (import.meta.env.VITE_CORREOS_SENDER_ADDRESS_TYPE as string | undefined)?.trim() || "CL",
    block: (import.meta.env.VITE_CORREOS_SENDER_BLOCK as string | undefined)?.trim() || "",
    company: (import.meta.env.VITE_CORREOS_SENDER_COMPANY as string | undefined)?.trim() || "Shenna Brows Studio",
    contactPerson: (import.meta.env.VITE_CORREOS_SENDER_CONTACT_PERSON as string | undefined)?.trim() || senderName,
    contactPhone: (import.meta.env.VITE_CORREOS_SENDER_PHONE as string | undefined)?.trim() || "",
    country: (import.meta.env.VITE_CORREOS_SENDER_COUNTRY as string | undefined)?.trim() || "ESP",
    cp: (import.meta.env.VITE_CORREOS_SENDER_CP as string | undefined)?.trim() || "",
    doiNumber: (import.meta.env.VITE_CORREOS_SENDER_DOI_NUMBER as string | undefined)?.trim() || "",
    doiType: (import.meta.env.VITE_CORREOS_SENDER_DOI_TYPE as string | undefined)?.trim() || "1",
    door: (import.meta.env.VITE_CORREOS_SENDER_DOOR as string | undefined)?.trim() || "",
    email: (import.meta.env.VITE_CORREOS_SENDER_EMAIL as string | undefined)?.trim() || stringFrom(orderRecord, ["email"], ""),
    floor: (import.meta.env.VITE_CORREOS_SENDER_FLOOR as string | undefined)?.trim() || "",
    language: "spa",
    lastName1: senderLastName1,
    lastName2: (import.meta.env.VITE_CORREOS_SENDER_LAST_NAME2 as string | undefined)?.trim() || "",
    locality: (import.meta.env.VITE_CORREOS_SENDER_LOCALITY as string | undefined)?.trim() || "",
    name: senderFirstName,
    number: (import.meta.env.VITE_CORREOS_SENDER_NUMBER as string | undefined)?.trim() || "",
    portal: (import.meta.env.VITE_CORREOS_SENDER_PORTAL as string | undefined)?.trim() || "",
    province: (import.meta.env.VITE_CORREOS_SENDER_PROVINCE as string | undefined)?.trim() || "",
    smsNumber: normalizeCorreosSmsNumber(
      (import.meta.env.VITE_CORREOS_SENDER_SMS as string | undefined)?.trim() || "",
      (import.meta.env.VITE_CORREOS_SENDER_COUNTRY as string | undefined)?.trim() || "ESP"
    ),
    staircase: (import.meta.env.VITE_CORREOS_SENDER_STAIRCASE as string | undefined)?.trim() || "",
    zip: "",
  };

  const weightGrams = toNumericText(
    import.meta.env.VITE_CORREOS_DEFAULT_WEIGHT_GRAMS as string | undefined,
    "500"
  );
  const packageId = `Pedido ${stringFrom(orderRecord, ["id"], "").slice(0, 8) || "WEB"}`;

  return {
    errorCodeLanguage: "spa",
    shipments: [
      {
        addressee,
        admissionProvince: (import.meta.env.VITE_CORREOS_ADMISSION_PROVINCE as string | undefined)?.trim() || sender.province || "",
        clientNumber: (import.meta.env.VITE_CORREOS_CLIENT_NUMBER as string | undefined)?.trim() || "",
        contractNumber: (import.meta.env.VITE_CORREOS_CONTRACT_NUMBER as string | undefined)?.trim() || "",
        deliveryMethod: (import.meta.env.VITE_CORREOS_DELIVERY_METHOD as string | undefined)?.trim() || "",
        labellerCode: (import.meta.env.VITE_CORREOS_LABELLER_CODE as string | undefined)?.trim() || "",
        packages: [
          {
            clientReference: stringFrom(orderRecord, ["id"], ""),
            clientReference2: stringFrom(orderRecord, ["email"], ""),
            clientReference3: "",
            packageId,
            packageWeightGrams: weightGrams,
          },
        ],
        packagesNumber: "1",
        product: (import.meta.env.VITE_CORREOS_PRODUCT as string | undefined)?.trim() || "",
        sender,
        shipmentReference1: stringFrom(orderRecord, ["id"], ""),
        shipmentReference2: "",
        shipmentReference3: "",
        totalWeight: weightGrams,
      },
    ],
  };
};

const validateCorreosPreregisterConfig = (order: any): string[] => {
  const orderRecord = (order && typeof order === "object" ? order : {}) as Record<string, unknown>;
  const rawAddress =
    orderRecord.shipping_address && typeof orderRecord.shipping_address === "object"
      ? (orderRecord.shipping_address as Record<string, unknown>)
      : {};

  const missing: string[] = [];
  const requiredEnvVars = [
    "VITE_CORREOS_CLIENT_NUMBER",
    "VITE_CORREOS_CONTRACT_NUMBER",
    "VITE_CORREOS_PRODUCT",
    "VITE_CORREOS_DELIVERY_METHOD",
    "VITE_CORREOS_LABELLER_CODE",
    "VITE_CORREOS_SENDER_ADDRESS",
    "VITE_CORREOS_SENDER_CP",
    "VITE_CORREOS_SENDER_LOCALITY",
    "VITE_CORREOS_SENDER_PROVINCE",
    "VITE_CORREOS_SENDER_PHONE",
    "VITE_CORREOS_SENDER_EMAIL",
    "VITE_CORREOS_ADMISSION_PROVINCE",
  ] as const;

  for (const key of requiredEnvVars) {
    const value = (import.meta.env[key] as string | undefined)?.trim();
    if (!value) {
      missing.push(key);
    }
  }

  const requiredAddressChecks: Array<{ label: string; keys: string[] }> = [
    { label: "shipping_address.name", keys: ["name", "full_name", "fullName", "recipient", "recipient_name"] },
    { label: "shipping_address.address", keys: ["line1", "address", "street", "address1"] },
    { label: "shipping_address.cp", keys: ["postal_code", "zip", "cp", "postcode"] },
    { label: "shipping_address.locality", keys: ["city", "locality", "town"] },
    { label: "shipping_address.province", keys: ["province_code", "provinceCode", "province", "state_code", "state", "region"] },
    { label: "shipping_address.phone", keys: ["phone", "contactPhone", "phoneNumber"] },
  ];

  for (const check of requiredAddressChecks) {
    if (check.label === "shipping_address.province") {
      const fallbackProvince = (import.meta.env.VITE_CORREOS_DEFAULT_ADDRESSEE_PROVINCE as string | undefined)?.trim();
      if (fallbackProvince) continue;
      const countryVal = stringFrom(rawAddress, ["country", "country_code"], "ESP");
      const cpVal = stringFrom(rawAddress, ["postal_code", "zip", "cp", "postcode"], "");
      if (isSpainCountryCode(countryVal) && normalizeSpainPostalCode(cpVal).length === 5) continue;
    }
    if (!readStringField(rawAddress, check.keys)) {
      missing.push(check.label);
    }
  }

  if (!readStringField(orderRecord, ["email"])) {
    missing.push("order.email");
  }

  return missing;
};

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingTestimonial, setTogglingTestimonial] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productDialogMode, setProductDialogMode] = useState<"create" | "edit">("edit");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<{ id: string; email: string } | null>(null);
  const [orderToShip, setOrderToShip] = useState<{ id: string; email: string } | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [orderDeleteInProgress, setOrderDeleteInProgress] = useState(false);
  const [shippingOrderInProgress, setShippingOrderInProgress] = useState(false);
  const [printingLabelOrderId, setPrintingLabelOrderId] = useState<string | null>(null);
  const [downloadingTicketOrderId, setDownloadingTicketOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderItemsCache, setOrderItemsCache] = useState<Record<string, unknown[]>>({});
  const [loadingOrderItemsId, setLoadingOrderItemsId] = useState<string | null>(null);

  const productCatalogById = useMemo(() => {
    const map = new Map<string, ProductCatalogEntry>();
    for (const p of products) {
      if (!p?.id) continue;
      map.set(String(p.id), {
        name: String(p.name ?? ""),
        variants: parseColorVariants(p.color_variants),
      });
    }
    return map;
  }, [products]);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, entry] of productCatalogById) {
      if (entry.name) map.set(id, entry.name);
    }
    return map;
  }, [productCatalogById]);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("orders")
      .select("*, return_requests(id, status, created_at)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast({
        title: "Error al cargar pedidos",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setOrders(data || []);
  }, [toast]);

  const toggleOrderDetails = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);

    const order = orders.find((o) => o.id === orderId);
    const isPending =
      order?.status === "pending_payment" || order?.status === "pending";

    if (isPending && !order?.pending_cart_snapshot) {
      const { data: freshOrder } = await (supabase as any)
        .from("orders")
        .select("pending_cart_snapshot")
        .eq("id", orderId)
        .maybeSingle();
      if (freshOrder?.pending_cart_snapshot) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, pending_cart_snapshot: freshOrder.pending_cart_snapshot } : o,
          ),
        );
      }
    }

    if (orderItemsCache[orderId] !== undefined) return;

    setLoadingOrderItemsId(orderId);
    const { data, error } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    setLoadingOrderItemsId(null);
    if (error) {
      toast({
        title: "No se pudieron cargar los productos",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setOrderItemsCache((prev) => ({ ...prev, [orderId]: data || [] }));
  };

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      const [, productsRes, testimonialsRes] = await Promise.all([
        fetchOrders(),
        (supabase as any).from("products").select("*").order("name"),
        (supabase as any).from("testimonials").select("*").order("created_at", { ascending: false }),
      ]);
      setProducts(productsRes.data || []);
      // Enrich testimonials with profile names
      const rawTestimonials = testimonialsRes.data || [];
      if (rawTestimonials.length > 0) {
        const userIds = rawTestimonials.map((t: any) => t.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
        setTestimonials(rawTestimonials.map((t: any) => ({ ...t, author_name: profileMap.get(t.user_id) || "Anónimo" })));
      } else {
        setTestimonials([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [isAdmin, fetchOrders]);

  if (authLoading) return <main className="min-h-screen bg-cream pt-32 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></main>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const refreshProducts = async () => {
    const { data } = await (supabase as any).from("products").select("*").order("name");
    setProducts(data || []);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const openEdit = (product: any) => {
    setProductDialogMode("edit");
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const openCreateProduct = () => {
    setProductDialogMode("create");
    setEditingProduct(null);
    setEditDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleteInProgress(true);
    const id = productToDelete.id;
    const { error } = await (supabase as any).from("products").delete().eq("id", id);
    if (error) {
      toast({
        title: "No se pudo eliminar",
        description: error.message.includes("foreign key")
          ? "Este producto está vinculado a pedidos antiguos. En base de datos habría que usar ON DELETE SET NULL o conservar el producto."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Producto eliminado" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductToDelete(null);
    }
    setDeleteInProgress(false);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setOrderDeleteInProgress(true);
    const id = orderToDelete.id;
    const { data: deletedRows, error } = await (supabase as any)
      .from("orders")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      toast({
        title: "No se pudo eliminar",
        description: error.message,
        variant: "destructive",
      });
    } else if (!deletedRows?.length) {
      toast({
        title: "No se pudo eliminar",
        description: "El pedido no se eliminó en la base de datos. Comprueba permisos o recarga la página.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Pedido eliminado" });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      setExpandedOrderId((prev) => (prev === id ? null : prev));
      setOrderItemsCache((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      setOrderToDelete(null);
    }
    setOrderDeleteInProgress(false);
  };

  const confirmMarkOrderShipped = async () => {
    if (!orderToShip) return;
    setShippingOrderInProgress(true);
    const id = orderToShip.id;
    const { data, error } = await supabase.functions.invoke("mark-order-shipped", {
      body: { orderId: id },
    });
    if (error || data?.error) {
      toast({
        title: "No se pudo marcar como enviado",
        description: data?.error || error?.message || "Error desconocido",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pedido enviado",
        description: "El cliente recibirá un correo de confirmación de envío.",
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status: "shipped", shipped_at: data.shippedAt ?? new Date().toISOString() } : o,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      setOrderToShip(null);
    }
    setShippingOrderInProgress(false);
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    setTogglingTestimonial(id);
    const { error } = await (supabase as any)
      .from("testimonials")
      .update({ is_featured: !current })
      .eq("id", id);
    if (!error) {
      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_featured: !current } : t))
      );
    }
    setTogglingTestimonial(null);
  };

  const openAndPrint = (url: string, existingPopup?: Window | null) => {
    const popup =
      existingPopup && !existingPopup.closed
        ? existingPopup
        : window.open("about:blank", "_blank");

    // Algunos navegadores pueden abrir la pestaña y aun así devolver null.
    // En ese caso no detenemos el flujo con error.
    if (!popup) {
      window.open(url, "_blank");
      return;
    }

    popup.location.href = url;
    popup.addEventListener("load", () => popup.print(), { once: true });
  };

  const printBase64Pdf = (base64: string, popup?: Window | null) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    openAndPrint(url, popup);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const downloadBase64Pdf = (base64: string, filename: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleDownloadTicket = async (order: { id: string }) => {
    setDownloadingTicketOrderId(order.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-order-ticket", {
        body: { orderId: order.id },
      });
      if (error) throw error;
      const payload = data as { pdfBase64?: string; filename?: string; error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      const pdfBase64 = payload?.pdfBase64;
      if (!pdfBase64) throw new Error("No se recibió el PDF");
      const filename = payload.filename?.trim() || `ticket-${order.id.slice(0, 8)}.pdf`;
      downloadBase64Pdf(pdfBase64, filename);
      toast({ title: "Factura descargada" });
    } catch (e) {
      toast({
        title: "No se pudo descargar la factura",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDownloadingTicketOrderId(null);
    }
  };

  const extractAndPrintLabel = (payload: unknown, popup?: Window | null) => {
    if (!payload) {
      throw new Error("Correos no devolvió contenido para la etiqueta.");
    }

    if (typeof payload === "string") {
      if (payload.startsWith("http://") || payload.startsWith("https://")) {
        openAndPrint(payload, popup);
        return;
      }

      // Compatibilidad: algunos servicios devuelven PDF en base64 en texto plano.
      if (payload.length > 100) {
        printBase64Pdf(payload, popup);
        return;
      }
    }

    if (typeof payload === "object") {
      const data = payload as Record<string, unknown>;
      const error = data.error;
      if (typeof error === "string" && error.trim().length > 0) {
        throw new Error(error);
      }

      if (typeof data.qrCode === "string" && data.qrCode.length > 0 && !data.pdf && !data.label_url) {
        throw new Error(
          "Correos devolvió solo qrCode (no PDF ni URL de etiqueta). Suele indicar URL de impresión incorrecta: en Supabase usa CORREOS_API_BASE_URL=https://api1.correos.es y endpoint de etiquetas /support/labels/api/v1/labels/print (VITE_CORREOS_LABELS_ENDPOINT=/labels/print)."
        );
      }

      const apiPdf = data.pdf as string | undefined;
      if (apiPdf && typeof apiPdf === "string") {
        printBase64Pdf(apiPdf, popup);
        return;
      }

      const maybeUrl = (data.label_url || data.labelUrl || data.pdf_url || data.pdfUrl || data.url) as string | undefined;
      if (maybeUrl && typeof maybeUrl === "string") {
        openAndPrint(maybeUrl, popup);
        return;
      }

      const maybeBase64 = (data.label_base64 || data.labelBase64 || data.pdf_base64 || data.pdfBase64) as string | undefined;
      if (maybeBase64 && typeof maybeBase64 === "string") {
        printBase64Pdf(maybeBase64, popup);
        return;
      }
    }

    throw new Error("Respuesta de etiqueta no compatible. Revisa el formato que devuelve tu endpoint de Correos.");
  };

  const handlePrintLabel = async (order: any) => {
    const orderStatus = String(order?.status || "");
    if (!canPrintShippingLabel(orderStatus)) {
      toast({
        title: "No se puede imprimir la etiqueta",
        description: PENDING_ORDER_STATUSES.has(orderStatus)
          ? "El pedido aún no está pagado."
          : "Este pedido está cancelado.",
        variant: "destructive",
      });
      return;
    }
    const latestReturn = pickLatestReturnRequest(
      order?.return_requests as { status: ReturnRequestStatus; created_at: string }[] | undefined,
    );
    if (returnStatusBlocksFulfillment(latestReturn?.status)) {
      toast({
        title: "No se puede imprimir la etiqueta",
        description: "Hay una devolución con el producto ya recibido; tramita el reembolso antes.",
        variant: "destructive",
      });
      return;
    }
    setPrintingLabelOrderId(order.id);
    // Abrimos una pestaña en el gesto de usuario para evitar bloqueos por popup
    // cuando la respuesta de Correos llega tras varias llamadas asíncronas.
    const printPopup = window.open("about:blank", "_blank");
    let lastPreregisterData: unknown | null = null;
    try {
      const endpoint = (import.meta.env.VITE_CORREOS_LABELS_ENDPOINT as string | undefined)?.trim() || "/labels/print";
      const preregisterEndpoint = (import.meta.env.VITE_CORREOS_PREREGISTER_ENDPOINT as string | undefined)?.trim() || "";
      const shippingAddress =
        order.shipping_address && typeof order.shipping_address === "object"
          ? (order.shipping_address as Record<string, unknown>)
          : {};
      const orderRecord = (order && typeof order === "object" ? order : {}) as Record<string, unknown>;

      const shipmentsCsv = (import.meta.env.VITE_CORREOS_SHIPMENTS as string | undefined)?.trim() || "";
      const shipmentFromEnv = shipmentsCsv
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const shipmentFromOrder = readStringField(orderRecord, SHIPMENT_CODE_KEYS);
      const shipmentFromAddress = readStringField(shippingAddress, SHIPMENT_CODE_KEYS);

      let shipments = shipmentFromEnv.length > 0
        ? shipmentFromEnv
        : [shipmentFromOrder, shipmentFromAddress].filter((v): v is string => Boolean(v));

      if (shipments.length === 0) {
        const missingFields = validateCorreosPreregisterConfig(order);
        if (missingFields.length > 0) {
          throw new Error(
            `Faltan datos para preregistrar en Correos: ${missingFields.join(", ")}`
          );
        }

        const preregisterBody = buildCorreosPreregisterBody(order);
        const preregisterRes = await supabase.functions.invoke("correos-api", {
          body: {
            service: "preregister",
            endpoint: preregisterEndpoint || "/api/v1/delivery",
            method: "POST",
            body: preregisterBody,
          },
        });

        if (preregisterRes.error) throw preregisterRes.error;
        const newShipmentCode = extractCorreosPreregisterCode(preregisterRes.data);
        if (!newShipmentCode) {
          throw new Error(
            `Correos preregister no devolvió shipmentCode ni packageCode. ${describeCorreosPreregisterFailure(preregisterRes.data)}`
          );
        }

        const labelCodes = extractCorreosLabelPrintCodes(preregisterRes.data);
        const expeditionCodes = extractCorreosExpeditionPrintCodes(preregisterRes.data);
        const codesOrder = (import.meta.env.VITE_CORREOS_LABEL_CODES_ORDER as string | undefined)?.trim().toLowerCase();
        const shipmentsForPrint =
          codesOrder === "expedition_first" && expeditionCodes.length > 0
            ? expeditionCodes
            : labelCodes.length > 0
              ? labelCodes
              : [newShipmentCode];

        const { error: saveError } = await (supabase as any)
          .from("orders")
          .update({ correos_shipment_code: newShipmentCode })
          .eq("id", order.id);
        if (saveError) {
          throw new Error(
            "Se obtuvo codEnvio de Correos, pero no se pudo guardar en orders.correos_shipment_code. Ejecuta la migración pendiente."
          );
        }

        setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, correos_shipment_code: newShipmentCode } : item)));
        shipments = shipmentsForPrint;
        lastPreregisterData = preregisterRes.data;

      }

      const buildLabelRequestBody = (shipmentsArr: string[]) => ({
        application: (import.meta.env.VITE_CORREOS_APPLICATION as string | undefined)?.trim() || "P3",
        documentationType: getEnvNumber(import.meta.env.VITE_CORREOS_DOCUMENTATION_TYPE as string | undefined, 0),
        print: {
          preregisterInd: getEnvNumber(import.meta.env.VITE_CORREOS_LABEL_PREREGISTER_IND as string | undefined, 1),
          labelFormat: getEnvNumber(import.meta.env.VITE_CORREOS_LABEL_FORMAT as string | undefined, 2),
          labelOrderType: getEnvNumber(import.meta.env.VITE_CORREOS_LABEL_ORDER_TYPE as string | undefined, 4),
          labelPrintInitialPosition: getEnvNumber(import.meta.env.VITE_CORREOS_LABEL_INITIAL_POSITION as string | undefined, 1),
          labelPrintMode: getEnvNumber(import.meta.env.VITE_CORREOS_LABEL_PRINT_MODE as string | undefined, 2),
          clientLogo: (import.meta.env.VITE_CORREOS_LABEL_CLIENT_LOGO as string | undefined)?.trim() || "",
          shipments: shipmentsArr,
        },
      });

      const invokeLabels = (shipmentsArr: string[]) =>
        supabase.functions.invoke("correos-api", {
          body: {
            service: "labels",
            endpoint,
            method: "POST",
            body: buildLabelRequestBody(shipmentsArr),
          },
        });

      let { data, error } = await invokeLabels(shipments);

      if (error) throw error;

      if (
        data &&
        isCorreosLabelsOidError(data) &&
        lastPreregisterData &&
        extractCorreosLabelPrintCodes(lastPreregisterData).length > 0 &&
        extractCorreosExpeditionPrintCodes(lastPreregisterData).length > 0
      ) {
        const pkg = extractCorreosLabelPrintCodes(lastPreregisterData);
        const exp = extractCorreosExpeditionPrintCodes(lastPreregisterData);
        const sentSameAsPackages =
          pkg.length > 0 &&
          shipments.length === pkg.length &&
          shipments.every((c, i) => c === pkg[i]);
        const sentSameAsExpedition =
          exp.length > 0 &&
          shipments.length === exp.length &&
          shipments.every((c, i) => c === exp[i]);
        if (sentSameAsPackages && exp.join("|") !== pkg.join("|")) {
          const retry = await invokeLabels(exp);
          data = retry.data;
          error = retry.error;
        } else if (sentSameAsExpedition && pkg.join("|") !== exp.join("|")) {
          const retry = await invokeLabels(pkg);
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) throw error;

      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const errCode = d.code;
        const more = d.moreInformation as Record<string, unknown> | undefined;
        if (errCode === "404" || errCode === 404 || d.message === "Not Found") {
          const detail =
            (more && typeof more.errorMessage === "string" && more.errorMessage.trim() && more.errorMessage) ||
            (more && typeof more.description === "string" && more.description.trim() && more.description) ||
            (typeof d.message === "string" ? d.message : "");
          throw new Error(
            `Correos labels: ${detail || "Not Found"}. Si indica oid/eid: en Correos deben vincular la app de Identidad (OAuth) con el mismo contrato/cliente que el client_id de Developers del preregister; o prueba con VITE_CORREOS_LABEL_PREREGISTER_IND=0 si Correos lo indica para tu producto.`
          );
        }
      }

      extractAndPrintLabel(data, printPopup);
      toast({ title: "Etiqueta preparada", description: "Se abrió la etiqueta para imprimir." });
    } catch (err: unknown) {
      if (printPopup && !printPopup.closed) {
        printPopup.close();
      }
      const message = err instanceof Error ? err.message : "Error inesperado al generar la etiqueta";
      toast({
        title: "No se pudo imprimir la etiqueta",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPrintingLabelOrderId(null);
    }
  };

  return (
    <main className="min-h-screen bg-cream pt-28 pb-16">
      <div className="container mx-auto px-6 max-w-7xl">
        <AnimatedSection>
          <h1 className="font-playfair text-3xl font-bold text-carbon mb-2">Panel de Administración</h1>
          <p className="text-carbon/50 text-sm mb-10">Gestiona pedidos, inventario y productos.</p>
        </AnimatedSection>

        {/* Orders */}
        <AnimatedSection delay={0.05}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Pedidos Recientes</h2>
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden mb-12">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-carbon/40">No hay pedidos aún</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gold/10">
                    <TableHead className="text-carbon/60">ID</TableHead>
                    <TableHead className="text-carbon/60">Email</TableHead>
                    <TableHead className="text-carbon/60">Total</TableHead>
                    <TableHead className="text-carbon/60">Estado</TableHead>
                    <TableHead className="text-carbon/60">Devolución</TableHead>
                    <TableHead className="text-carbon/60">Fecha</TableHead>
                    <TableHead className="text-carbon/60 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const isExpanded = expandedOrderId === o.id;
                    const isLoadingItems = loadingOrderItemsId === o.id;
                    const displayLines = getDisplayOrderLines(
                      o,
                      orderItemsCache[o.id],
                      productNameById,
                      productCatalogById,
                    );
                    const addressLines = formatShippingAddressLines(o.shipping_address);
                    const hasCorreosCode = Boolean(o.correos_shipment_code?.trim());
                    const latestReturn = pickLatestReturnRequest(
                      o.return_requests as { status: ReturnRequestStatus; created_at: string }[] | undefined,
                    );
                    const returnDisplay = getOrderReturnDisplay(
                      o,
                      latestReturn ? { status: latestReturn.status } : null,
                    );
                    const fulfillmentBlocked = returnStatusBlocksFulfillment(latestReturn?.status);

                    return (
                      <Fragment key={o.id}>
                        <TableRow
                          className={`border-b border-gold/5 cursor-pointer transition-colors hover:bg-gold/[0.03] ${isExpanded ? "bg-gold/[0.04]" : ""}`}
                          onClick={() => toggleOrderDetails(o.id)}
                          aria-expanded={isExpanded}
                        >
                          <TableCell className="font-mono text-xs text-carbon/70">
                            <span className="inline-flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gold shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-carbon/30 shrink-0" />
                              )}
                              {o.id.slice(0, 8)}
                            </span>
                          </TableCell>
                      <TableCell className="text-carbon text-sm">{o.email}</TableCell>
                      <TableCell className="text-carbon font-medium">€{Number(o.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[o.status] || "bg-gray-100 text-gray-700"}>
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {returnDisplay ? (
                          <Badge variant="outline" className={returnDisplay.badgeClass}>
                            {returnDisplay.label}
                          </Badge>
                        ) : (
                          <span className="text-carbon/30 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-carbon/60 text-sm">
                        {new Date(o.created_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-2">
                          {o.status === "paid" && !fulfillmentBlocked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setOrderToShip({ id: o.id, email: o.email })}
                              className="border-sky-200 text-sky-700 hover:bg-sky-50"
                              aria-label={`Marcar pedido de ${o.email} como enviado`}
                            >
                              <Truck className="h-4 w-4 mr-1.5" />
                              Pedido enviado
                            </Button>
                          )}
                          {PAID_ORDER_STATUSES.has(o.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadTicket(o)}
                              disabled={downloadingTicketOrderId === o.id}
                              className="border-gold/20 text-gold hover:bg-gold/5"
                              aria-label={`Descargar factura de ${o.email}`}
                            >
                              {downloadingTicketOrderId === o.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <FileDown className="h-4 w-4 mr-1.5" />
                                  Factura
                                </>
                              )}
                            </Button>
                          )}
                          {canPrintShippingLabel(o.status) && !fulfillmentBlocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintLabel(o)}
                              disabled={printingLabelOrderId === o.id}
                              className="border-gold/20 text-gold hover:bg-gold/5"
                            >
                              {printingLabelOrderId === o.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Printer className="h-4 w-4 mr-1.5" />
                                  Imprimir
                                </>
                              )}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOrderToDelete({ id: o.id, email: o.email })}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            aria-label={`Eliminar pedido de ${o.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                        {isExpanded && (
                          <TableRow className="border-b border-gold/10 bg-cream/40">
                            <TableCell colSpan={7} className="p-0">
                              <div className="px-5 py-5 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest text-carbon/40 mb-1">ID completo</p>
                                    <p className="font-mono text-xs text-carbon/80 break-all">{o.id}</p>
                                    {o.stripe_session_id && (
                                      <p className="text-xs text-carbon/50 mt-2">
                                        Ref. pago: <span className="font-mono">{o.stripe_session_id}</span>
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest text-carbon/40 mb-1">Fecha y hora</p>
                                    <p className="text-sm text-carbon">
                                      {new Date(o.created_at).toLocaleString("es-ES")}
                                    </p>
                                    {hasCorreosCode && (
                                      <p className="text-xs text-carbon/50 mt-2">
                                        Envío Correos: <span className="font-mono">{o.correos_shipment_code}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {addressLines.length > 0 ? (
                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest text-carbon/40 mb-2">
                                      Dirección de envío
                                    </p>
                                    <div className="text-sm text-carbon space-y-0.5">
                                      {addressLines.map((line, i) => (
                                        <p key={i}>{line}</p>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-carbon/40 italic">Sin dirección de envío registrada</p>
                                )}

                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-carbon/40 mb-2">Productos</p>
                                  {isLoadingItems ? (
                                    <div className="flex items-center gap-2 text-sm text-carbon/50 py-2">
                                      <Loader2 className="h-4 w-4 animate-spin text-gold" />
                                      Cargando líneas del pedido…
                                    </div>
                                  ) : displayLines.length === 0 ? (
                                    <p className="text-sm text-carbon/40 italic">
                                      {o.status === "pending_payment" || o.status === "pending"
                                        ? "El pedido aún no tiene líneas confirmadas"
                                        : "No hay productos en este pedido"}
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {displayLines.map((line, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-3 bg-white/80 rounded-lg border border-gold/10 p-3"
                                        >
                                          <div className="w-9 h-9 bg-cream rounded flex items-center justify-center shrink-0">
                                            <Package className="h-4 w-4 text-gold/70" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-carbon truncate">{line.name}</p>
                                            {line.variant && (
                                              <p className="text-xs text-carbon/50 flex items-center gap-1.5">
                                                {line.variantHex && (
                                                  <span
                                                    className="inline-block w-3 h-3 rounded-full border border-gold/25 shrink-0"
                                                    style={{ backgroundColor: line.variantHex }}
                                                    aria-hidden
                                                  />
                                                )}
                                                <span>Variante: {line.variant}</span>
                                              </p>
                                            )}
                                            <p className="text-xs text-carbon/40">Cantidad: {line.quantity}</p>
                                          </div>
                                          {line.unitPrice != null && (
                                            <p className="text-sm font-medium text-carbon shrink-0">
                                              €{(line.unitPrice * line.quantity).toFixed(2)}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="border-t border-gold/10 pt-4 max-w-xs ml-auto space-y-1.5">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-carbon/50">Subtotal</span>
                                    <span className="text-carbon">€{Number(o.subtotal ?? 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-carbon/50">Gastos de envío</span>
                                    <span className="text-carbon">€{Number(o.shipping ?? 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-medium pt-2 border-t border-gold/10">
                                    <span className="text-carbon">Total</span>
                                    <span className="font-playfair text-lg text-carbon">
                                      €{Number(o.total ?? 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.07}>
          <AdminReturnsManager onReturnsChanged={() => void fetchOrders()} />
        </AnimatedSection>

        <div className="mb-12" />

        <AnimatedSection delay={0.08}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-2">Gestión de stock</h2>
          <p className="text-carbon/40 text-sm mb-4">
            Los botones y el campo numérico modifican solo un borrador; pulsa Guardar en cada fila para aplicar en el servidor. El ajuste rápido usa la cantidad del recuadro superior de la tabla.
          </p>
          <AdminStockManager products={products} loading={loading} onStockUpdated={refreshProducts} />
        </AnimatedSection>

        <div className="mb-12" />

        {/* Products */}
        <AnimatedSection delay={0.1}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="font-playfair text-xl font-semibold text-carbon">Productos</h2>
              <p className="text-carbon/40 text-sm mt-1">Crea, edita o elimina artículos del catálogo en Supabase.</p>
            </div>
            <Button
              type="button"
              onClick={openCreateProduct}
              className="shrink-0 bg-gold hover:bg-gold/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo producto
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden group">
                <div className="aspect-square bg-muted overflow-hidden">
                  <img src={getProductImageUrl(p.image_url, p.slug)} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-carbon">{p.name}</h3>
                  <p className="text-xs text-carbon/40 mb-1 flex flex-wrap items-center gap-2">
                    <span>{p.category}</span>
                    {p.is_pack ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                        Pack
                      </span>
                    ) : null}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-carbon font-semibold">€{Number(p.price).toFixed(2)}</span>
                    <span className="text-xs text-carbon/50">Stock: {p.stock}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="flex-1 border-gold/20 text-gold hover:bg-gold/5"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductToDelete({ id: p.id, name: p.name })}
                      className="border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                      aria-label={`Eliminar ${p.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AlertDialog open={orderToShip !== null} onOpenChange={(open) => !open && setOrderToShip(null)}>
          <AlertDialogContent className="bg-cream border-gold/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-playfair text-carbon">¿Confirmar envío del pedido?</AlertDialogTitle>
              <AlertDialogDescription className="text-carbon/60 space-y-2">
                <span>
                  Se marcará como <strong>enviado</strong> el pedido de{" "}
                  <span className="font-medium text-carbon">{orderToShip?.email}</span>{" "}
                  (<span className="font-mono text-xs">{orderToShip?.id.slice(0, 8)}</span>).
                </span>
                <span className="block">
                  El cliente recibirá un correo avisando del envío y dejará de poder cancelar el pedido; solo podrá
                  solicitar devolución.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gold/20">Cancelar</AlertDialogCancel>
              <Button
                onClick={() => void confirmMarkOrderShipped()}
                disabled={shippingOrderInProgress}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                {shippingOrderInProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar envío
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={orderToDelete !== null} onOpenChange={(open) => !open && setOrderToDelete(null)}>
          <AlertDialogContent className="bg-cream border-gold/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-playfair text-carbon">¿Eliminar pedido?</AlertDialogTitle>
              <AlertDialogDescription className="text-carbon/60 space-y-2">
                <p>
                  El pedido de{" "}
                  <span className="font-medium text-carbon">{orderToDelete?.email}</span>{" "}
                  (<span className="font-mono text-xs">{orderToDelete?.id.slice(0, 8)}</span>) desaparecerá de la base
                  de datos de forma permanente.
                </p>
                <p className="font-medium text-carbon">
                  Esto no devolverá el dinero al cliente. Si hubo un pago, deberás gestionar el reembolso por tu cuenta
                  (por ejemplo en Redsys).
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gold/20">Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => void confirmDeleteOrder()}
                disabled={orderDeleteInProgress}
              >
                {orderDeleteInProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Eliminar pedido
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={productToDelete !== null} onOpenChange={(open) => !open && setProductToDelete(null)}>
          <AlertDialogContent className="bg-cream border-gold/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-playfair text-carbon">¿Eliminar producto?</AlertDialogTitle>
              <AlertDialogDescription className="text-carbon/60">
                Se borrará de forma permanente{" "}
                <span className="font-medium text-carbon">{productToDelete?.name}</span>. No podrás deshacer esta acción.
                Si el producto figura en líneas de pedido, la base de datos puede rechazar el borrado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gold/20">Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => void confirmDeleteProduct()}
                disabled={deleteInProgress}
              >
                {deleteInProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ProductEditDialog
          product={editingProduct}
          mode={productDialogMode}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}
          onSaved={refreshProducts}
        />

        <div className="mb-12" />

        {/* Newsletter Sender */}
        <AnimatedSection delay={0.13}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Newsletter</h2>
          <p className="text-carbon/40 text-sm mb-4">Envía campañas solo a suscriptores con consentimiento activo.</p>
          <AdminEmailSender />
        </AnimatedSection>

        <div className="mb-12" />
        <AnimatedSection delay={0.12}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Contenido de la Web</h2>
          <p className="text-carbon/40 text-sm mb-4">Edita los textos del inicio y la página "Sobre mí".</p>
          <AdminContentEditor />
        </AnimatedSection>

        <div className="mb-12" />
        <AnimatedSection delay={0.14}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Personalización del Tema</h2>
          <p className="text-carbon/40 text-sm mb-4">Cambia los colores de fondo de las secciones, del footer y de la tipografía.</p>
          <AdminThemeEditor />
        </AnimatedSection>

        <div className="mb-12" />

        {/* Testimonials Management */}
        <AnimatedSection delay={0.15}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Gestión de Testimonios</h2>
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            {testimonials.length === 0 ? (
              <div className="p-8 text-center text-carbon/40">No hay testimonios aún</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gold/10">
                    <TableHead className="text-carbon/60">Cliente</TableHead>
                    <TableHead className="text-carbon/60">Comentario</TableHead>
                    <TableHead className="text-carbon/60">Fecha</TableHead>
                    <TableHead className="text-carbon/60 text-center">Destacado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((t) => (
                    <TableRow key={t.id} className="border-b border-gold/5">
                      <TableCell className="text-carbon text-sm font-medium">
                        {t.author_name || "Anónimo"}
                      </TableCell>
                      <TableCell className="text-carbon/70 text-sm max-w-xs truncate">
                        {t.content}
                      </TableCell>
                      <TableCell className="text-carbon/60 text-sm">
                        {new Date(t.created_at).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={t.is_featured}
                          onCheckedChange={() => toggleFeatured(t.id, t.is_featured)}
                          disabled={togglingTestimonial === t.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </AnimatedSection>
      </div>
    </main>
  );
};

export default Admin;
