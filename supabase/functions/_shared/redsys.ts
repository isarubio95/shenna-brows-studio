import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import forge from "npm:node-forge@1.3.1";

/** Parámetros enviados en Ds_MerchantParameters (JSON → Base64). Valores como cadenas según TPV Redsys. */
export type RedsysMerchantParams = Record<string, string>;

/** Valores admitidos en Ds_Merchant_PayMethods (redirección). Ver documentación Redsys / TPV Virtual. */
export const REDSYS_PAY_METHOD_TOKENS = ["card", "z"] as const;

/** Bizum en redirección exige `z` aislado; mezclarlo con `card` bloquea el resto en muchos terminales. */
export const REDSYS_BIZUM_PAY_METHOD = "z";

/**
 * Pago principal por redirección: solo `card`.
 * Con Apple Pay dado de alta en el terminal, Redsys puede mostrarlo en la pantalla de tarjeta.
 */
export const DEFAULT_REDSYS_PAY_METHODS = "card";

const ALLOWED_PAY_METHOD_SET = new Set<string>(REDSYS_PAY_METHOD_TOKENS);

/**
 * Resuelve Ds_Merchant_PayMethods. En redirección, omitir el campo suele mostrar solo tarjeta;
 * hay que enviar la lista explícita de métodos contratados en el terminal.
 */
export function resolveRedsysPayMethods(requested?: string | null): string {
  const envDefault = Deno.env.get("REDSYS_PAY_METHODS")?.trim();
  const raw = requested?.trim();

  if (!raw) {
    return envDefault || DEFAULT_REDSYS_PAY_METHODS;
  }
  const normalized = raw.toLowerCase();
  if (normalized === "all" || normalized === "default") {
    return DEFAULT_REDSYS_PAY_METHODS;
  }
  if (normalized === "xpay" || normalized === "wallets" || normalized === "google") {
    throw new Error(
      "Ese método de pago no está disponible. Usa «Pagar» (tarjeta) o «Pagar con Bizum».",
    );
  }

  const tokens = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) {
    return envDefault || DEFAULT_REDSYS_PAY_METHODS;
  }
  for (const token of tokens) {
    if (!ALLOWED_PAY_METHOD_SET.has(token)) {
      throw new Error(`Método de pago Redsys no válido: ${token}`);
    }
  }
  return tokens.join(",");
}

export function applyRedsysPayMethods(
  params: RedsysMerchantParams,
  payMethods: string,
): RedsysMerchantParams {
  const out = { ...params };
  for (const key of Object.keys(out)) {
    if (key.toLowerCase() === "ds_merchant_paymethods") delete out[key];
  }
  out.Ds_Merchant_PayMethods = payMethods;
  return out;
}

export function zeroPadUtf8(value: string, blockSize: number): Buffer {
  const buf = Buffer.from(String(value), "utf8");
  const rem = buf.length % blockSize;
  const padLen = rem === 0 ? 0 : blockSize - rem;
  return Buffer.concat([buf, Buffer.alloc(padLen, 0)]);
}

/** Triple DES CBC (Redsys / OpenSSL `des-ede3-cbc`): en forge el nombre registrado es `3DES-CBC`. IV 0, sin PKCS#7, entrada múltiplo de 8. */
export function encrypt3DES(orderId: string, secretBase64: string): string {
  const secretKey = Buffer.from(secretBase64, "base64");
  const padded = zeroPadUtf8(orderId, 8);
  const iv = Buffer.alloc(8, 0);
  const cipher = forge.cipher.createCipher("3DES-CBC", secretKey.toString("binary"));
  cipher.start({ iv: iv.toString("binary") });
  cipher.mode.pad = () => true;
  cipher.update(forge.util.createBuffer(padded.toString("binary"), "binary"));
  cipher.finish();
  return Buffer.from(cipher.output.getBytes(), "binary").toString("base64");
}

export function mac256(orderEncodedBase64: string, merchantParametersBase64: string): string {
  const key = Buffer.from(orderEncodedBase64, "base64");
  const hexMac = createHmac("sha256", key).update(merchantParametersBase64, "utf8").digest("hex");
  return Buffer.from(hexMac, "hex").toString("base64");
}

export function fromBase64UrlSafe(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeMerchantParameters(params: RedsysMerchantParams): string {
  return Buffer.from(JSON.stringify(params), "utf8").toString("base64");
}

export function createMerchantSignature(
  secretBase64: string,
  merchantOrder: string,
  merchantParametersBase64: string,
): string {
  const encodedOrder = encrypt3DES(merchantOrder, secretBase64);
  return mac256(encodedOrder, merchantParametersBase64);
}

export function decodeMerchantParameters<T = Record<string, string>>(merchantParametersBase64: string): T {
  const json = Buffer.from(merchantParametersBase64, "base64").toString("utf8");
  return JSON.parse(json) as T;
}

export function createMerchantSignatureNotif(secretBase64: string, merchantParametersBase64: string): string {
  const decoded = decodeMerchantParameters<Record<string, unknown>>(merchantParametersBase64);
  const order = decoded.Ds_Order ?? decoded.DS_ORDER ?? "";
  const encodedOrder = encrypt3DES(String(order), secretBase64);
  return mac256(encodedOrder, merchantParametersBase64);
}

export function isMerchantSignatureValid(
  receivedSignature: string,
  secretBase64: string,
  merchantParametersBase64: string,
): boolean {
  const computed = createMerchantSignatureNotif(secretBase64, merchantParametersBase64);
  return fromBase64UrlSafe(receivedSignature) === fromBase64UrlSafe(computed);
}

export function formatAmount12(amountMinorUnits: number): string {
  return String(Math.max(0, Math.round(amountMinorUnits))).padStart(12, "0");
}

export function redsysRealizarPagoUrl(env: "test" | "production"): string {
  return env === "production"
    ? "https://sis.redsys.es/sis/realizarPago"
    : "https://sis-t.redsys.es:25443/sis/realizarPago";
}

export type RedsysEnv = "test" | "production";

export function getRedsysEnv(): RedsysEnv {
  const v = (Deno.env.get("REDSYS_ENV") || "production").toLowerCase();
  return v === "test" || v === "sandbox" ? "test" : "production";
}

export function redsysTrataPeticionRestUrl(env: RedsysEnv): string {
  return env === "production"
    ? "https://sis.redsys.es/sis/rest/trataPeticionREST"
    : "https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST";
}

export type RedsysCredentials = {
  merchantCode: string;
  terminal: string;
  secretKey: string;
  currency: string;
};

export function getRedsysCredentialsFromEnv(): RedsysCredentials | null {
  const merchantCode = Deno.env.get("REDSYS_MERCHANT_CODE")?.trim();
  const terminal = Deno.env.get("REDSYS_TERMINAL")?.trim() || "001";
  const secretKey = Deno.env.get("REDSYS_SECRET_KEY")?.trim();
  const currency = Deno.env.get("REDSYS_CURRENCY")?.trim() || "978";
  if (!merchantCode || !secretKey) return null;
  return { merchantCode, terminal, secretKey, currency };
}

export function padRedsysTerminal(terminal: string): string {
  return terminal.length >= 3 ? terminal : terminal.padStart(3, "0");
}

function pickDecodedField(decoded: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = decoded[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

/** Devolución REST: Ds_Response 0900 = devolución correcta (doc Redsys). */
export function isRedsysRefundAuthorized(dsResponse: string): boolean {
  return dsResponse.trim() === "0900";
}

export function redsysRefundErrorMessage(dsResponse: string): string {
  const code = dsResponse.trim();
  const known: Record<string, string> = {
    "0106": "No hay operación original para devolver con ese número de pedido.",
    "0116": "El importe a devolver supera el permitido.",
    "0184": "La autenticación del titular ha fallado.",
    "0190": "Denegación sin especificar motivo.",
    "0909": "Error de sistema.",
    "0912": "Emisor no disponible.",
    "0913": "Pedido repetido.",
    "0944": "Sesión incorrecta.",
    "0950": "Operación de devolución no permitida.",
    "9064": "Número de posiciones de la tarjeta incorrecto.",
    "9078": "Tipo de operación no permitida para esa tarjeta.",
    "9093": "Tarjeta no existente.",
    "9094": "Rechazo servidores internacionales.",
    "9104": "Comercio con «titular seguro» y titular sin clave de compra segura.",
    "9126": "Operación duplicada.",
    "9132": "La fecha de caducidad no puede superar la actual.",
    "9142": "Tiempo excedido para el pago.",
    "9407": "Importe inválido.",
    "9412": "Pedido duplicado.",
    "9413": "Pedido no encontrado.",
  };
  if (known[code]) return known[code];
  if (code) return `Redsys rechazó la devolución (código ${code}).`;
  return "Redsys rechazó la devolución.";
}

export type RedsysRefundResult =
  | { ok: true; responseCode: string; authCode?: string }
  | { ok: false; responseCode: string; message: string };

export async function executeRedsysRefund(input: {
  merchantOrder: string;
  amountMinor: number;
  credentials: RedsysCredentials;
}): Promise<RedsysRefundResult> {
  const amountMinor = Math.max(0, Math.round(input.amountMinor));
  if (amountMinor < 1) {
    return { ok: false, responseCode: "", message: "Importe de reembolso inválido" };
  }

  const merchantOrder = String(input.merchantOrder || "").trim();
  if (!merchantOrder) {
    return { ok: false, responseCode: "", message: "Falta el número de pedido Redsys" };
  }

  const { merchantCode, secretKey, currency } = input.credentials;
  const terminal = padRedsysTerminal(input.credentials.terminal);

  const merchantParams: RedsysMerchantParams = {
    Ds_Merchant_Amount: formatAmount12(amountMinor),
    Ds_Merchant_Order: merchantOrder,
    Ds_Merchant_MerchantCode: merchantCode,
    Ds_Merchant_Currency: currency,
    Ds_Merchant_TransactionType: "3",
    Ds_Merchant_Terminal: terminal,
  };

  const dsMerchantParameters = encodeMerchantParameters(merchantParams);
  const dsSignature = createMerchantSignature(secretKey, merchantOrder, dsMerchantParameters);

  const url = redsysTrataPeticionRestUrl(getRedsysEnv());
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Ds_SignatureVersion: "HMAC_SHA256_V1",
        Ds_MerchantParameters: dsMerchantParameters,
        Ds_Signature: dsSignature,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("redsys_refund_fetch_error", msg);
    return { ok: false, responseCode: "", message: "No se pudo conectar con Redsys" };
  }

  if (!res.ok) {
    console.error("redsys_refund_http_error", res.status, await res.text());
    return { ok: false, responseCode: "", message: `Redsys no respondió correctamente (${res.status})` };
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, responseCode: "", message: "Respuesta Redsys no válida" };
  }

  const respParams = String(raw.Ds_MerchantParameters ?? raw.ds_merchantparameters ?? "");
  const respSig = String(raw.Ds_Signature ?? raw.ds_signature ?? "");
  if (!respParams || !respSig) {
    return { ok: false, responseCode: "", message: "Respuesta Redsys incompleta" };
  }

  if (!isMerchantSignatureValid(respSig, secretKey, respParams)) {
    console.warn("redsys_refund_bad_signature");
    return { ok: false, responseCode: "", message: "Firma de respuesta Redsys no válida" };
  }

  const decoded = decodeMerchantParameters<Record<string, unknown>>(respParams);
  const dsResponse = pickDecodedField(decoded, ["Ds_Response", "DS_RESPONSE"]);
  if (isRedsysRefundAuthorized(dsResponse)) {
    const authCode = pickDecodedField(decoded, [
      "Ds_AuthorisationCode",
      "DS_AUTHORISATIONCODE",
      "Ds_AuthorizationCode",
    ]);
    return { ok: true, responseCode: dsResponse, authCode: authCode || undefined };
  }

  console.warn("redsys_refund_declined", { dsResponse, merchantOrder, amountMinor });
  return { ok: false, responseCode: dsResponse, message: redsysRefundErrorMessage(dsResponse) };
}
