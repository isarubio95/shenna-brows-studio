import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildOrderConfirmationHtml } from "../_shared/orderConfirmationEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resendApiUrl = "https://api.resend.com/emails";
const resendFromAddress =
  Deno.env.get("RESEND_FROM_ADDRESS")?.trim() || "Shenna Brows <info@shennabrows.com>";

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
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "Misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return new Response(JSON.stringify({ error: "Missing orderId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select(
      "id, email, status, subtotal, shipping, total, stripe_session_id, correos_shipment_code, order_items ( product_name, quantity, unit_price )",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Pedido no encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const status = String(order.status || "");
  if (status === "cancelled") {
    return new Response(JSON.stringify({ error: "El pedido está cancelado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === "shipped" || status === "delivered") {
    return new Response(JSON.stringify({ error: "El pedido ya consta como enviado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status !== "paid") {
    return new Response(
      JSON.stringify({ error: "Solo se pueden marcar como enviados los pedidos pagados" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const email = String(order.email || "").trim().toLowerCase();
  if (!email) {
    return new Response(JSON.stringify({ error: "El pedido no tiene email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const shippedAt = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("orders")
    .update({ status: "shipped", shipped_at: shippedAt })
    .eq("id", orderId);

  if (updateErr) {
    console.error("mark_order_shipped_update", updateErr);
    return new Response(JSON.stringify({ error: "No se pudo actualizar el pedido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const items = (order as { order_items?: Array<{ product_name?: string; quantity?: number; unit_price?: number }> })
    .order_items;
  const lines = Array.isArray(items)
    ? items.map((it) => ({
        name: String(it.product_name ?? "Producto"),
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 0)),
        unitPrice: Number(it.unit_price) || 0,
      }))
    : [];

  if (!lines.length) {
    return new Response(JSON.stringify({ error: "El pedido no tiene líneas" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const code = order.correos_shipment_code != null ? String(order.correos_shipment_code).trim() : "";
  const orderRef = String(order.stripe_session_id || order.id);
  const subtotal = Number(order.subtotal ?? 0);
  const shipping = Number(order.shipping ?? 0);
  const total = Number(order.total ?? subtotal + shipping);

  const html = buildOrderConfirmationHtml({
    variant: "shipped",
    orderRef,
    subtotal,
    shipping,
    total,
    lines,
    correosShipmentCode: code || null,
  });

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromAddress,
      to: [email],
      subject: "Tu pedido ya ha sido enviado — Shenna Brows",
      html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("mark_order_shipped_resend", errText);
    await admin.from("orders").update({ status: "paid", shipped_at: null }).eq("id", orderId);
    return new Response(JSON.stringify({ error: "Error al enviar el correo al cliente" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, status: "shipped", shippedAt }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
