import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { buildOrderCancelAdminNotifyHtml, buildOrderCancelCustomerHtml } from "../_shared/orderCancelEmails.ts";
import { executeRedsysRefund, getRedsysCredentialsFromEnv } from "../_shared/redsys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const resendFrom =
  Deno.env.get("RESEND_FROM_ADDRESS")?.trim() || "Shenna Brows <info@shennabrows.com>";
const adminNotifyEmail =
  Deno.env.get("ADMIN_NOTIFY_EMAIL")?.trim() || "shennabrows@hotmail.com";

async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resendApiKey) {
    console.warn("cancel_order_resend_not_configured");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: resendFrom, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("cancel_order_resend_error", await res.text());
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = getClientIp(req);
  const ipLimit = await applyRateLimit({
    endpoint: "cancel-order",
    kind: "ip",
    key: ip,
    limit: 10,
    window: "1 m",
  });
  if (!ipLimit.success) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(ipLimit) },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "Misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  const userLimit = await applyRateLimit({
    endpoint: "cancel-order",
    kind: "identity",
    key: userId,
    limit: 5,
    window: "1 h",
  });
  if (!userLimit.success) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(userLimit) },
    });
  }

  let body: { orderId?: string; customerNote?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orderId = String(body.orderId || "").trim();
  const customerNote = String(body.customerNote || "").trim().slice(0, 2000) || null;

  if (!orderId) {
    return new Response(JSON.stringify({ error: "Datos inválidos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, email, status, total, user_id, stripe_session_id, refund_status, shipped_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Pedido no encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email?.trim().toLowerCase() ?? "";
  const orderEmail = String(order.email || "").trim().toLowerCase();
  const orderUserId = order.user_id as string | null;

  const ownsOrder =
    orderUserId === userId ||
    (!orderUserId && userEmail.length > 0 && userEmail === orderEmail);

  if (!ownsOrder) {
    return new Response(JSON.stringify({ error: "No tienes permiso sobre este pedido" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const status = String(order.status || "");
  if (status === "cancelled") {
    return new Response(JSON.stringify({ error: "Este pedido ya está cancelado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === "shipped" || status === "delivered" || order.shipped_at) {
    return new Response(
      JSON.stringify({
        error: "El pedido ya ha sido enviado. Solicita una devolución desde tu cuenta.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (status !== "paid") {
    return new Response(JSON.stringify({ error: "Este pedido no se puede cancelar en su estado actual" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (String(order.refund_status || "none") !== "none") {
    return new Response(JSON.stringify({ error: "Este pedido ya tiene un reembolso registrado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const total = Number(order.total ?? 0);
  const redsysOrder = String(order.stripe_session_id || "").trim();

  if (!redsysOrder) {
    return new Response(
      JSON.stringify({ error: "Este pedido no tiene referencia Redsys; no se puede reembolsar automáticamente" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (total <= 0) {
    return new Response(JSON.stringify({ error: "Importe del pedido inválido para reembolso" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const credentials = getRedsysCredentialsFromEnv();
  if (!credentials) {
    return new Response(JSON.stringify({ error: "TPV Redsys no configurado en el servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amountMinor = Math.round(total * 100);
  const redsysResult = await executeRedsysRefund({
    merchantOrder: redsysOrder,
    amountMinor,
    credentials,
  });

  if (!redsysResult.ok) {
    return new Response(JSON.stringify({ error: redsysResult.message }), {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (redsysResult.authCode) {
    console.log("cancel_order_redsys_refund_ok", { orderId, redsysOrder, authCode: redsysResult.authCode });
  }

  const { error: updateErr } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      refund_status: "full",
      returned: true,
    })
    .eq("id", orderId);

  if (updateErr) {
    console.error("cancel_order_update", updateErr);
    return new Response(JSON.stringify({ error: "No se pudo cancelar el pedido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminHtml = buildOrderCancelAdminNotifyHtml({
    orderId,
    orderEmail: orderEmail || userEmail,
    redsysOrder: redsysOrder || null,
    total,
    customerNote,
  });
  const customerHtml = buildOrderCancelCustomerHtml({
    orderIdShort: orderId.slice(0, 8),
    total,
  });

  await sendResendEmail(
    adminNotifyEmail,
    `[Shenna] Pedido cancelado por el cliente — ${orderId.slice(0, 8)}`,
    adminHtml,
  );

  const notifyEmail = orderEmail || userEmail;
  if (notifyEmail) {
    await sendResendEmail(
      notifyEmail,
      "Tu pedido ha sido cancelado — Shenna Brows",
      customerHtml,
    );
  }

  return new Response(JSON.stringify({ ok: true, status: "cancelled" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
