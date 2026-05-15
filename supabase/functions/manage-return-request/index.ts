import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { buildReturnCustomerStatusHtml } from "../_shared/returnEmails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ManageAction = "approve" | "reject" | "product_received" | "refund" | "cancel";

const ACTION_TO_STATUS: Record<ManageAction, string> = {
  approve: "approved",
  reject: "rejected",
  product_received: "product_received",
  refund: "refunded",
  cancel: "cancelled",
};

const VALID_TRANSITIONS: Record<string, ManageAction[]> = {
  requested: ["approve", "reject", "cancel"],
  approved: ["product_received", "reject", "cancel"],
  product_received: ["refund", "reject"],
};

const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const resendFrom =
  Deno.env.get("RESEND_FROM_ADDRESS")?.trim() || "Shenna Brows <info@shennabrows.com>";

const CUSTOMER_NOTIFY_STATUSES = new Set(["approved", "rejected", "product_received", "refunded", "cancelled"]);

async function sendResendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resendApiKey || !html) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: resendFrom, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("manage_return_request_resend_error", await res.text());
  }
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
    endpoint: "manage-return-request",
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

  let body: {
    returnRequestId?: string;
    action?: ManageAction;
    adminNote?: string;
    refundedAmount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const returnRequestId = String(body.returnRequestId || "").trim();
  const action = body.action;
  const adminNote = String(body.adminNote || "").trim().slice(0, 2000) || null;

  if (!returnRequestId || !action || !ACTION_TO_STATUS[action]) {
    return new Response(JSON.stringify({ error: "Parámetros inválidos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: row, error: fetchErr } = await admin
    .from("return_requests")
    .select("id, order_id, user_id, status, requested_amount, orders ( email, stripe_session_id, total )")
    .eq("id", returnRequestId)
    .maybeSingle();

  if (fetchErr || !row) {
    return new Response(JSON.stringify({ error: "Solicitud no encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const currentStatus = String(row.status);
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(action)) {
    return new Response(
      JSON.stringify({ error: `No se puede ${action} desde el estado ${currentStatus}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const newStatus = ACTION_TO_STATUS[action];
  const orderRel = row.orders as { email?: string; stripe_session_id?: string | null; total?: number } | null;
  const orderEmail = String(orderRel?.email || "").trim();
  const orderTotal = Number(orderRel?.total ?? row.requested_amount ?? 0);

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    admin_note: adminNote ?? undefined,
  };

  if (action === "refund") {
    const refundedAmount =
      body.refundedAmount != null && Number.isFinite(Number(body.refundedAmount))
        ? Number(body.refundedAmount)
        : orderTotal;
    if (refundedAmount <= 0) {
      return new Response(JSON.stringify({ error: "Importe de reembolso inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    updatePayload.refunded_amount = refundedAmount;
    updatePayload.refunded_at = new Date().toISOString();
  }

  const { error: upErr } = await admin
    .from("return_requests")
    .update(updatePayload)
    .eq("id", returnRequestId);

  if (upErr) {
    console.error("manage_return_request_update", upErr);
    return new Response(JSON.stringify({ error: "No se pudo actualizar la solicitud" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "refund") {
    const refundedAmount = Number(updatePayload.refunded_amount);
    const refundStatus = refundedAmount >= orderTotal - 0.01 ? "full" : "partial";
    await admin
      .from("orders")
      .update({ refund_status: refundStatus })
      .eq("id", row.order_id);
  }

  if (CUSTOMER_NOTIFY_STATUSES.has(newStatus) && orderEmail) {
    const html = buildReturnCustomerStatusHtml({
      status: newStatus,
      orderIdShort: String(row.order_id).slice(0, 8),
      adminNote,
    });
    const subjects: Record<string, string> = {
      approved: "Tu devolución ha sido aprobada",
      rejected: "Actualización sobre tu solicitud de devolución",
      product_received: "Hemos recibido tu devolución",
      refunded: "Reembolso tramitado",
      cancelled: "Solicitud de devolución cancelada",
    };
    await sendResendEmail(orderEmail, subjects[newStatus] ?? "Actualización de devolución", html);
  }

  return new Response(JSON.stringify({ ok: true, status: newStatus }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
