import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { resolveRefundInvoiceContext } from "../_shared/invoiceHelpers.ts";
import {
  generatePurchaseTicketPdfBase64,
  generateRectificativeInvoicePdfBase64,
} from "../_shared/purchaseTicket.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAID_STATUSES = new Set(["paid", "shipped", "delivered", "cancelled"]);

function shippingAddressName(addr: unknown): Record<string, string> | null {
  if (!addr || typeof addr !== "object") return null;
  const raw = addr as Record<string, unknown>;
  const name = raw.name != null ? String(raw.name).trim() : "";
  if (!name) return null;
  return { name };
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
    endpoint: "generate-order-ticket",
    kind: "ip",
    key: ip,
    limit: 30,
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
  const { data: roleData } = await userClient
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

  let orderId: string;
  try {
    const body = await req.json() as { orderId?: string };
    orderId = String(body.orderId ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!orderId) {
    return new Response(JSON.stringify({ error: "orderId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select(
      "id, email, status, subtotal, shipping, total, stripe_session_id, shipping_address, created_at, refund_status, returned",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Pedido no encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const status = String(order.status ?? "");
  if (!PAID_STATUSES.has(status)) {
    return new Response(JSON.stringify({ error: "El pedido no admite factura" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orderRef = String(order.stripe_session_id ?? "").trim() || order.id.slice(0, 12);
  const email = String(order.email ?? "").trim();
  if (!email) {
    return new Response(JSON.stringify({ error: "Pedido sin email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select("product_name, quantity, unit_price")
    .eq("order_id", orderId);

  if (itemsErr) {
    return new Response(JSON.stringify({ error: itemsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!items?.length) {
    return new Response(JSON.stringify({ error: "El pedido no tiene líneas" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const lines = items.map((row) => ({
    name: String(row.product_name ?? "Producto"),
    quantity: Math.max(1, Math.floor(Number(row.quantity) || 0)),
    unitPrice: Number(row.unit_price) || 0,
  }));

  const subtotal = Number(order.subtotal) || 0;
  const shipping = Number(order.shipping) || 0;
  const total = Number(order.total) || subtotal + shipping;
  const originalIssuedAt = order.created_at ? new Date(String(order.created_at)) : new Date();
  const refundStatus = String(order.refund_status ?? "none");
  const returned = Boolean(order.returned);

  const { data: refundedReturns } = await admin
    .from("return_requests")
    .select("refunded_amount")
    .eq("order_id", orderId)
    .eq("status", "refunded");

  const refundedReturnAmounts = (refundedReturns ?? []).map((row) =>
    Number((row as { refunded_amount?: number }).refunded_amount ?? 0)
  );

  const refundContext = resolveRefundInvoiceContext({
    orderStatus: status,
    orderSubtotal: subtotal,
    orderShipping: shipping,
    orderTotal: total,
    refundStatus,
    returned,
    lines,
    refundedReturnAmounts,
  });

  const isCreditNote = refundContext !== null;
  const isPaidLike = new Set(["paid", "shipped", "delivered"]).has(status);

  if (!isCreditNote && !isPaidLike) {
    return new Response(
      JSON.stringify({ error: "Solo hay factura de devolución cuando el reembolso está tramitado" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    if (isCreditNote && refundContext) {
      const rectificativeIssuedAt = new Date();
      const pdfBase64 = await generateRectificativeInvoicePdfBase64({
        orderRef,
        email,
        originalIssuedAt,
        issuedAt: rectificativeIssuedAt,
        reason: refundContext.reason,
        subtotal: refundContext.refundSubtotal,
        shipping: refundContext.refundShipping,
        total: refundContext.refundGrossTotal,
        lines: refundContext.lines,
        shippingAddress: shippingAddressName(order.shipping_address),
      });

      return new Response(
        JSON.stringify({
          pdfBase64,
          filename: `factura-rectificativa-${orderRef}.pdf`,
          documentType: "credit_note",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const pdfBase64 = await generatePurchaseTicketPdfBase64({
      orderRef,
      email,
      subtotal,
      shipping,
      total,
      lines,
      shippingAddress: shippingAddressName(order.shipping_address),
      issuedAt: originalIssuedAt,
    });

    return new Response(
      JSON.stringify({
        pdfBase64,
        filename: `factura-${orderRef}.pdf`,
        documentType: "invoice",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("generate_order_ticket_error", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "No se pudo generar el documento" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
