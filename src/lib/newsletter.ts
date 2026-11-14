import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
export const NEWSLETTER_ENDPOINT = `${SUPABASE_URL}/functions/v1/newsletter-subscribe`;

/** Dónde se apuntó la suscriptora (se ve en el panel → Newsletter). */
export type NewsletterSource = "footer_form" | "welcome_popup" | "campaign_cta" | "register_form";

export interface NewsletterSubscribeResult {
  welcomeCouponSent?: boolean;
  welcomeEmailSent?: boolean;
  alreadySubscribed?: boolean;
}

async function postNewsletter<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(NEWSLETTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || "No se pudo completar la operación");
  }
  return result as T;
}

/** Alta con consentimiento: guarda la suscripción y manda la bienvenida si es nueva. */
export function subscribeToNewsletter(email: string, source: NewsletterSource) {
  return postNewsletter<NewsletterSubscribeResult>({
    email: email.trim().toLowerCase(),
    privacyAccepted: true,
    source,
    action: "subscribe",
  });
}

/** Baja desde el enlace del email (el token lo firma el servidor). */
export function unsubscribeFromNewsletter(email: string, token: string) {
  return postNewsletter<{ message?: string }>({
    email: email.trim().toLowerCase(),
    token,
    action: "unsubscribe",
  });
}
