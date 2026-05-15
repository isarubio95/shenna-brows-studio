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
