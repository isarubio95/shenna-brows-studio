import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import AnimatedSection from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Printer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ProductEditDialog from "@/components/admin/ProductEditDialog";
import AdminContentEditor from "@/components/admin/AdminContentEditor";
import AdminEmailSender from "@/components/admin/AdminEmailSender";
import AdminThemeEditor from "@/components/admin/AdminThemeEditor";
import AdminStockManager from "@/components/admin/AdminStockManager";
import { getProductImageUrl } from "@/lib/product-images";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
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
    ["province", "province_code", "state_code", "state", "region"],
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
    { label: "shipping_address.province", keys: ["province", "province_code", "state_code", "state", "region"] },
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printingLabelOrderId, setPrintingLabelOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      const [ordersRes, productsRes, testimonialsRes] = await Promise.all([
        (supabase as any).from("orders").select("*").order("created_at", { ascending: false }).limit(20),
        (supabase as any).from("products").select("*").order("name"),
        (supabase as any).from("testimonials").select("*").order("created_at", { ascending: false }),
      ]);
      setOrders(ordersRes.data || []);
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
  }, [isAdmin]);

  if (authLoading) return <main className="min-h-screen bg-cream pt-32 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></main>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const refreshProducts = async () => {
    const { data } = await (supabase as any).from("products").select("*").order("name");
    setProducts(data || []);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
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
      <div className="container mx-auto px-6 max-w-5xl">
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
                    <TableHead className="text-carbon/60">Fecha</TableHead>
                    <TableHead className="text-carbon/60 text-right">Etiqueta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} className="border-b border-gold/5">
                      <TableCell className="font-mono text-xs text-carbon/70">{o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-carbon text-sm">{o.email}</TableCell>
                      <TableCell className="text-carbon font-medium">€{Number(o.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[o.status] || "bg-gray-100 text-gray-700"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-carbon/60 text-sm">{new Date(o.created_at).toLocaleDateString("es-ES")}</TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
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
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Editar Productos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden group">
                <div className="aspect-square bg-muted overflow-hidden">
                  <img src={getProductImageUrl(p.image_url, p.slug)} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-carbon">{p.name}</h3>
                  <p className="text-xs text-carbon/40 mb-1">{p.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-carbon font-semibold">€{Number(p.price).toFixed(2)}</span>
                    <span className="text-xs text-carbon/50">Stock: {p.stock}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(p)}
                    className="w-full mt-3 border-gold/20 text-gold hover:bg-gold/5"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <ProductEditDialog
          product={editingProduct}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
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
