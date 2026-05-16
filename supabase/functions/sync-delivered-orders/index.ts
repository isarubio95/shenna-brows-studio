import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { userHasAdminRole } from "../_shared/adminRole.ts";
import {
  fetchCorreosTrackingPayload,
  parseDeliveryFromTracking,
} from "../_shared/correosTracking.ts";
import { sendOrderDeliveredEmail } from "../_shared/sendOrderDeliveredEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ORDERS_PER_RUN = 40;
const DELAY_MS_BETWEEN_CORREOS_CALLS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isAuthorizedRequest(req: Request, supabaseUrl: string, anonKey: string): Promise<boolean> {
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return true;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return false;
  }

  return userHasAdminRole(supabase, claimsData.claims.sub as string);
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "Misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authorized = await isAuthorizedRequest(req, supabaseUrl, anonKey);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();

  const { data: orders, error: ordersError } = await admin
    .from("orders")
    .select("id, email, stripe_session_id, correos_shipment_code")
    .eq("status", "shipped")
    .not("correos_shipment_code", "is", null)
    .order("correos_tracking_synced_at", { ascending: true, nullsFirst: true })
    .limit(MAX_ORDERS_PER_RUN);

  if (ordersError) {
    console.error("sync_delivered_orders_fetch", ordersError);
    return new Response(JSON.stringify({ error: "No se pudieron cargar pedidos" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary = {
    checked: 0,
    delivered: 0,
    stillShipped: 0,
    trackingErrors: 0,
    emailsSent: 0,
    emailErrors: 0,
    orderIds: [] as string[],
  };

  const { data: pendingEmailOrders, error: pendingEmailError } = await admin
    .from("orders")
    .select("id, email, stripe_session_id")
    .eq("status", "delivered")
    .is("delivered_email_sent_at", null)
    .limit(20);

  if (pendingEmailError) {
    console.error("sync_delivered_orders_pending_email", pendingEmailError);
  } else {
    for (const order of pendingEmailOrders ?? []) {
      const emailResult = await sendOrderDeliveredEmail(admin, order);
      if (emailResult.sent) {
        summary.emailsSent += 1;
      } else if (emailResult.error) {
        summary.emailErrors += 1;
      }
    }
  }

  for (const order of orders ?? []) {
    const orderId = String(order.id);
    const shipmentCode = String(order.correos_shipment_code ?? "").trim();
    if (!shipmentCode) continue;

    summary.checked += 1;

    try {
      const tracking = await fetchCorreosTrackingPayload(shipmentCode);
      if (!tracking) {
        summary.trackingErrors += 1;
        await admin
          .from("orders")
          .update({ correos_tracking_synced_at: nowIso })
          .eq("id", orderId);
        continue;
      }

      const delivery = parseDeliveryFromTracking(tracking.payload);
      if (delivery.delivered) {
        const deliveredAt = delivery.at ?? nowIso;
        const { error: updateError } = await admin
          .from("orders")
          .update({
            status: "delivered",
            delivered_at: deliveredAt,
            correos_tracking_synced_at: nowIso,
          })
          .eq("id", orderId)
          .eq("status", "shipped");

        if (updateError) {
          console.error("sync_delivered_orders_update", orderId, updateError);
          summary.trackingErrors += 1;
        } else {
          summary.delivered += 1;
          summary.orderIds.push(orderId);
          const emailResult = await sendOrderDeliveredEmail(admin, {
            id: orderId,
            email: (order as { email?: string | null }).email ?? null,
            stripe_session_id: (order as { stripe_session_id?: string | null }).stripe_session_id ?? null,
          });
          if (emailResult.sent) {
            summary.emailsSent += 1;
          } else if (emailResult.error) {
            summary.emailErrors += 1;
          }
        }
      } else {
        summary.stillShipped += 1;
        await admin
          .from("orders")
          .update({ correos_tracking_synced_at: nowIso })
          .eq("id", orderId);
      }
    } catch (error) {
      summary.trackingErrors += 1;
      console.error("sync_delivered_orders_tracking", orderId, error);
      await admin
        .from("orders")
        .update({ correos_tracking_synced_at: nowIso })
        .eq("id", orderId);
    }

    await sleep(DELAY_MS_BETWEEN_CORREOS_CALLS);
  }

  return new Response(JSON.stringify({ ok: true, ...summary }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
