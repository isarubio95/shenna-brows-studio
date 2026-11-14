import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { sendResendEmail } from "../_shared/resend.ts";
import { formatDiscountLabel, type DiscountCodeRow } from "../_shared/discountCodes.ts";
import { buildCustomerEmail, loadCustomerEmailOverrides } from "../_shared/customerEmails.ts";
import { getPublicSiteUrl } from "../_shared/orderDeliveredEmail.ts";
import {
  buildUnsubscribeHeaders,
  buildUnsubscribePageUrl,
  isValidUnsubscribeToken,
} from "../_shared/newsletterUnsubscribe.ts";

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
    // El botón «Cancelar suscripción» del gestor de correo hace un POST con los
    // datos en la URL (RFC 8058); la web y el resto mandan JSON.
    const query = new URL(req.url).searchParams;
    const fromQuery = query.get("action") === "unsubscribe";
    const body = fromQuery ? {} : await req.json().catch(() => ({}));
    const { email, privacyAccepted, source, action, token } = fromQuery
      ? {
          email: query.get("email"),
          privacyAccepted: undefined,
          source: "unsubscribe_link",
          action: "unsubscribe",
          token: query.get("token"),
        }
      : body;
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
      if (!(await isValidUnsubscribeToken(normalizedEmail, token))) {
        return new Response(JSON.stringify({ error: "El enlace de baja no es válido" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient
        .from("newsletter_subscribers")
        .update({
          is_subscribed: false,
          unsubscribed_at: new Date().toISOString(),
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
      .select("id, is_subscribed, welcome_coupon_sent_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Popup de bienvenida: no permitir emails ya registrados
    if (sourceStr === "welcome_popup" && existingSub) {
      return new Response(
        JSON.stringify({ error: "Este email ya está registrado" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const wasSubscribed = existingSub?.is_subscribed === true;
    const nowIso = new Date().toISOString();
    const payload = {
      email: normalizedEmail,
      // Sin sesión no se pisa la cuenta ya enlazada (p. ej. desde el registro).
      ...(userId ? { user_id: userId } : {}),
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
    let welcomeEmailSent = false;

    // Quien ya estaba suscrita no recibe otra bienvenida.
    if (!wasSubscribed) {
      const overrides = await loadCustomerEmailOverrides(adminClient);
      const unsubscribeUrl = await buildUnsubscribePageUrl(normalizedEmail);
      const unsubscribeHeaders = await buildUnsubscribeHeaders(normalizedEmail);

      let welcomeCode: DiscountCodeRow | null = null;
      if (sourceStr === "welcome_popup") {
        const { data, error: welcomeErr } = await adminClient
          .from("discount_codes")
          .select(
            "id, code, discount_type, discount_value, min_subtotal, first_order_only, is_active, is_welcome_offer",
          )
          .eq("is_welcome_offer", true)
          .eq("is_active", true)
          .maybeSingle();
        if (welcomeErr) console.error("newsletter_welcome_code_query", welcomeErr);
        else if (!data) console.warn("newsletter_welcome_no_active_offer");
        welcomeCode = (data as DiscountCodeRow | null) ?? null;
      }

      if (welcomeCode) {
        const min = welcomeCode.min_subtotal == null ? null : Number(welcomeCode.min_subtotal);
        const built = buildCustomerEmail(
          {
            key: "welcome_discount",
            code: welcomeCode.code,
            discountLabel: formatDiscountLabel(welcomeCode),
            minSubtotal: min != null && Number.isFinite(min) ? min : null,
            firstOrderOnly: Boolean(welcomeCode.first_order_only),
            unsubscribeUrl,
          },
          overrides,
        );
        const sent = await sendResendEmail({
          to: normalizedEmail,
          subject: built.subject,
          html: built.html,
          headers: unsubscribeHeaders,
        });
        if (!sent.ok) {
          console.error("newsletter_welcome_email_failed", sent.status, sent.detail);
        } else {
          welcomeCouponSent = true;
          welcomeEmailSent = true;
          const { error: markErr } = await adminClient
            .from("newsletter_subscribers")
            .update({ welcome_coupon_sent_at: nowIso })
            .eq("email", normalizedEmail);
          if (markErr) {
            console.error("newsletter_welcome_mark_sent", markErr);
          }
        }
      } else {
        const built = buildCustomerEmail(
          { key: "newsletter_welcome", shopUrl: `${getPublicSiteUrl()}/tienda`, unsubscribeUrl },
          overrides,
        );
        const sent = await sendResendEmail({
          to: normalizedEmail,
          subject: built.subject,
          html: built.html,
          headers: unsubscribeHeaders,
        });
        if (!sent.ok) console.error("newsletter_plain_welcome_failed", sent.status, sent.detail);
        else welcomeEmailSent = true;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Suscripción guardada correctamente",
        welcomeCouponSent,
        welcomeEmailSent,
        alreadySubscribed: wasSubscribed,
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
