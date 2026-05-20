import { FunctionsHttpError } from "@supabase/supabase-js";

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  "Bot challenge failed":
    "La verificación de seguridad no se validó en el servidor. Vuelve a marcar el recuadro de Cloudflare e inténtalo de nuevo.",
  "Too many requests": "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.",
  "No items provided": "El carrito está vacío. Añade productos antes de pagar.",
  "Email inválido": "Revisa el email de contacto.",
  "Pago no configurado en el servidor": "El pago no está disponible temporalmente. Inténtalo más tarde.",
};

function mapKnownError(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "No se pudo procesar el pago. Inténtalo de nuevo.";
  return PAYMENT_ERROR_MESSAGES[trimmed] ?? trimmed;
}

export async function getEdgeFunctionErrorMessage(
  err: unknown,
  fallback = "No se pudo completar la operación.",
): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = (await err.context.json()) as { error?: string; message?: string };
      const raw = body?.error ?? body?.message;
      if (typeof raw === "string" && raw.trim()) {
        return mapKnownError(raw);
      }
    } catch {
      // ignore JSON parse errors
    }
    const status = err.context.status;
    if (status === 403) {
      return PAYMENT_ERROR_MESSAGES["Bot challenge failed"];
    }
    if (status === 429) {
      return PAYMENT_ERROR_MESSAGES["Too many requests"];
    }
  }

  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg && !/^Edge Function returned a non-2xx status code$/i.test(msg)) {
      return mapKnownError(msg);
    }
  }

  return fallback;
}
