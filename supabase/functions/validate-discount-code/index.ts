import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { resolveDiscountCode } from "../_shared/discountCodes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-visitor-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    endpoint: "validate-discount-code",
    kind: "ip",
    key: ip,
    limit: 30,
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
    const body = await req.json();
    const code = String(body?.code ?? "");
    const email = String(body?.customerEmail ?? body?.email ?? "").trim().toLowerCase();
    const subtotalEur = Number(body?.subtotalEur ?? body?.subtotal ?? 0);

    if (!EMAIL_REGEX.test(email)) {
      return new Response(JSON.stringify({ error: "Introduce tu email antes de aplicar el código" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(subtotalEur) || subtotalEur <= 0) {
      return new Response(JSON.stringify({ error: "Subtotal inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceKey || !supabaseUrl) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const resolved = await resolveDiscountCode({
      admin: admin as never,
      codeRaw: code,
      email,
      subtotalEur,
    });

    if (!resolved.ok) {
      return new Response(JSON.stringify({ error: resolved.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        code: resolved.discount.code,
        discountAmount: resolved.discount.amount,
        discountType: resolved.discount.discountType,
        discountValue: resolved.discount.discountValue,
        minSubtotal: resolved.discount.minSubtotal,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
