/**
 * Enlace para darse de baja de la newsletter. El token es un HMAC del email:
 * solo quien recibió el correo puede dar de baja esa dirección.
 */
import { getPublicSiteUrl } from "./orderDeliveredEmail.ts";

const encoder = new TextEncoder();

function unsubscribeSecret(): string {
  const secret =
    Deno.env.get("NEWSLETTER_UNSUBSCRIBE_SECRET")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!secret) throw new Error("No unsubscribe secret configured");
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function unsubscribeToken(email: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(unsubscribeSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`newsletter-unsubscribe:${email.trim().toLowerCase()}`),
  );
  return toBase64Url(new Uint8Array(signature)).slice(0, 32);
}

export async function isValidUnsubscribeToken(email: string, token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length !== 32) return false;
  const expected = await unsubscribeToken(email);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** Página de la web donde la clienta confirma la baja. */
export async function buildUnsubscribePageUrl(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const params = new URLSearchParams({ email: normalized, token: await unsubscribeToken(normalized) });
  return `${getPublicSiteUrl()}/baja?${params.toString()}`;
}

/** Cabeceras para el botón «Cancelar suscripción» de Gmail y otros (RFC 8058). */
export async function buildUnsubscribeHeaders(email: string): Promise<Record<string, string>> {
  const normalized = email.trim().toLowerCase();
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const params = new URLSearchParams({
    action: "unsubscribe",
    email: normalized,
    token: await unsubscribeToken(normalized),
  });
  return {
    "List-Unsubscribe": `<${supabaseUrl}/functions/v1/newsletter-subscribe?${params.toString()}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
