import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildAccountReviewUrl,
  getPublicSiteUrl,
  SHENNA_INSTAGRAM_URL,
} from "./orderDeliveredEmail.ts";
import { buildCustomerEmail, loadCustomerEmailOverrides } from "./customerEmails.ts";
import { sendResendEmail } from "./resend.ts";

export async function sendOrderDeliveredEmail(
  admin: SupabaseClient,
  order: {
    id: string;
    email: string | null;
    stripe_session_id?: string | null;
  },
): Promise<{ sent: boolean; error?: string }> {
  const email = String(order.email ?? "").trim().toLowerCase();
  if (!email) {
    return { sent: false, error: "missing_email" };
  }

  const orderRef = String(order.stripe_session_id || order.id);
  const { subject, html } = buildCustomerEmail(
    {
      key: "order_delivered",
      orderRef,
      reviewUrl: buildAccountReviewUrl(getPublicSiteUrl()),
      instagramUrl: SHENNA_INSTAGRAM_URL,
    },
    await loadCustomerEmailOverrides(admin),
  );

  const result = await sendResendEmail({ to: email, subject, html });

  if (!result.ok) {
    console.error("order_delivered_email_resend", order.id, result.status, result.detail);
    return { sent: false, error: result.detail };
  }

  const sentAt = new Date().toISOString();
  const { error: markError } = await admin
    .from("orders")
    .update({ delivered_email_sent_at: sentAt })
    .eq("id", order.id);

  if (markError) {
    console.error("order_delivered_email_mark", order.id, markError);
  }

  return { sent: true };
}
