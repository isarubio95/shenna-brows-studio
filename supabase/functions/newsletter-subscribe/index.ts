import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { sendResendEmail } from "../_shared/resend.ts";
import { buildWelcomeDiscountEmailHtml } from "../_shared/welcomeDiscountEmail.ts";
import { formatDiscountLabel, type DiscountCodeRow } from "../_shared/discountCodes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = getClientIp(req);
  const ipLimit = await applyRateLimit({
    endpoint: "newsletter-subscribe",
    kind: "ip",
    key: ip,
    limit: 8,
    window: "1 m",
  });

  if (!ipLimit.success) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...rateLimitHeaders(ipLimit),
      },
    });
  }

  try {
    const { email, privacyAccepted, source, action } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const mode = action === "unsubscribe" ? "unsubscribe" : "subscribe";
    const sourceStr = String(source ?? "public_form");

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "subscribe" && privacyAccepted !== true) {
      return new Response(JSON.stringify({ error: "Debes aceptar la política de privacidad" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseServiceRoleKey,
    );

    if (mode === "unsubscribe") {
      const { error } = await adminClient
        .from("newsletter_subscribers")
        .update({
          is_subscribed: false,
          unsubscribed_at: new Date().toISOString(),
          source: sourceStr,
        })
        .eq("email", normalizedEmail);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ message: "Suscripción cancelada correctamente" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await authClient.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        userId = String(data.claims.sub);
      }
    }

    const { data: existingSub } = await adminClient
      .from("newsletter_subscribers")
      .select("id, welcome_coupon_sent_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const payload = {
      email: normalizedEmail,
      user_id: userId,
      is_subscribed: true,
      privacy_accepted_at: nowIso,
      unsubscribed_at: null,
      source: sourceStr,
    };

    const { error: upsertError } = await adminClient
      .from("newsletter_subscribers")
      .upsert(payload, { onConflict: "email" });

    if (upsertError) {
      throw upsertError;
    }

    let welcomeCouponSent = false;
    const alreadySent = Boolean(existingSub?.welcome_coupon_sent_at);

    if (sourceStr === "welcome_popup" && !alreadySent) {
      const { data: welcomeCode, error: welcomeErr } = await adminClient
        .from("discount_codes")
        .select(
          "id, code, discount_type, discount_value, min_subtotal, first_order_only, is_active, is_welcome_offer",
        )
        .eq("is_welcome_offer", true)
        .eq("is_active", true)
        .maybeSingle();

      if (welcomeErr) {
        console.error("newsletter_welcome_code_query", welcomeErr);
      } else if (welcomeCode) {
        const row = welcomeCode as DiscountCodeRow;
        const html = buildWelcomeDiscountEmailHtml({
          code: row.code,
          discount: row,
        });
        const label = formatDiscountLabel(row);
        const sent = await sendResendEmail({
          to: normalizedEmail,
          subject: `Tu código de descuento ${label} — Shenna Brows`,
          html,
        });
        if (!sent.ok) {
          console.error("newsletter_welcome_email_failed", sent.status, sent.detail);
        } else {
          welcomeCouponSent = true;
          const { error: markErr } = await adminClient
            .from("newsletter_subscribers")
            .update({ welcome_coupon_sent_at: nowIso })
            .eq("email", normalizedEmail);
          if (markErr) {
            console.error("newsletter_welcome_mark_sent", markErr);
          }
        }
      } else {
        console.warn("newsletter_welcome_no_active_offer");
      }
    }

    return new Response(
      JSON.stringify({
        message: "Suscripción guardada correctamente",
        welcomeCouponSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
