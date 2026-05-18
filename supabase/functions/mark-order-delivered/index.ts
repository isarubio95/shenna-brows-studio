import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { userHasAdminRole } from "../_shared/adminRole.ts";
import { sendOrderDeliveredEmail } from "../_shared/sendOrderDeliveredEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MARKABLE_STATUSES = new Set(["paid", "shipped"]);

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

  const isAdmin = await userHasAdminRole(supabase, claimsData.claims.sub as string);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
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
    .select("id, email, status, stripe_session_id, shipped_at, delivered_email_sent_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Pedido no encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const status = String(order.status || "");
  if (status === "delivered") {
    return new Response(JSON.stringify({ error: "El pedido ya consta como entregado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === "cancelled") {
    return new Response(JSON.stringify({ error: "El pedido está cancelado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!MARKABLE_STATUSES.has(status)) {
    return new Response(
      JSON.stringify({ error: "Solo se pueden marcar como entregados los pedidos pagados o enviados" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const deliveredAt = new Date().toISOString();
  const patch: Record<string, string> = {
    status: "delivered",
    delivered_at: deliveredAt,
  };
  if (!order.shipped_at) {
    patch.shipped_at = deliveredAt;
  }

  const { error: updateErr } = await admin.from("orders").update(patch).eq("id", orderId);

  if (updateErr) {
    console.error("mark_order_delivered_update", updateErr);
    return new Response(JSON.stringify({ error: "No se pudo actualizar el pedido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let emailSent = Boolean(order.delivered_email_sent_at);
  if (!emailSent) {
    const emailResult = await sendOrderDeliveredEmail(admin, {
      id: orderId,
      email: order.email,
      stripe_session_id: order.stripe_session_id,
    });
    emailSent = emailResult.sent;
    if (!emailResult.sent) {
      console.error("mark_order_delivered_email", orderId, emailResult.error);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      status: "delivered",
      deliveredAt,
      emailSent,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
