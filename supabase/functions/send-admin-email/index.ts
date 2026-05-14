import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";

const RESEND_API = "https://api.resend.com";
const FROM_ADDRESS = "Shenna Brows <info@shennabrows.com>";
const NEWSLETTER_AUDIENCE = "newsletter";
/** Resend default team limit is 5 req/s; stay under it to avoid 429 on parallel bursts. */
const MIN_MS_BETWEEN_RESEND_CALLS = 220;
const MAX_429_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify admin
  const ip = getClientIp(req);
  const ipLimit = await applyRateLimit({
    endpoint: "send-admin-email",
    kind: "ip",
    key: ip,
    limit: 5,
    window: "1 m",
  });
  if (!ipLimit.success) {
    console.warn("rate_limit_block", { endpoint: "send-admin-email", scope: "ip", retryAfter: ipLimit.retryAfterSec });
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;
  const userLimit = await applyRateLimit({
    endpoint: "send-admin-email",
    kind: "identity",
    key: userId,
    limit: 10,
    window: "1 m",
  });
  if (!userLimit.success) {
    console.warn("rate_limit_block", { endpoint: "send-admin-email", scope: "user", userId, retryAfter: userLimit.retryAfterSec });
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(userLimit) },
    });
  }

  // Check admin role
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

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { recipients, subject, html, attachments, audience } = await req.json();
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseServiceRoleKey
    );

    let finalRecipients: string[] = [];
    if (audience === NEWSLETTER_AUDIENCE) {
      const { data, error } = await adminClient
        .from("newsletter_subscribers")
        .select("email")
        .eq("is_subscribed", true);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      finalRecipients = (data ?? [])
        .map((item) => String(item.email || "").trim().toLowerCase())
        .filter((email) => !!email);
    } else {
      finalRecipients = Array.isArray(recipients) ? recipients : [];
    }

    finalRecipients = [...new Set(finalRecipients)];

    if (!finalRecipients.length || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (finalRecipients.length > 100) {
      return new Response(JSON.stringify({ error: "Too many recipients in one request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // One Resend API call per recipient, sequentially throttled (parallel bursts hit 5 req/s limit → 429).
    const results: { email: string; success: boolean; error?: string }[] = [];
    let lastResendCallAt = 0;

    const sendOne = async (email: string): Promise<{ success: boolean; error?: string }> => {
      const sendBody: Record<string, unknown> = {
        from: FROM_ADDRESS,
        to: [email],
        subject,
        html,
      };

      if (attachments?.length > 0) {
        sendBody.attachments = attachments.map((att: { filename: string; content: string; content_type: string }) => ({
          filename: att.filename,
          content: att.content,
          content_type: att.content_type,
        }));
      }

      for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
        const now = Date.now();
        const wait = Math.max(0, MIN_MS_BETWEEN_RESEND_CALLS - (now - lastResendCallAt));
        if (wait > 0) await sleep(wait);
        lastResendCallAt = Date.now();

        const res = await fetch(`${RESEND_API}/emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sendBody),
        });

        if (res.status === 429 && attempt < MAX_429_RETRIES) {
          await res.text().catch(() => "");
          const retryAfter = Number(res.headers.get("retry-after"));
          const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 1000 * (attempt + 1);
          await sleep(backoffMs);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          return { success: false, error: errText };
        }
        await res.json();
        return { success: true };
      }
      return { success: false, error: "Too many retries after rate limit" };
    };

    for (const email of finalRecipients) {
      try {
        const outcome = await sendOne(email);
        results.push({ email, ...outcome });
      } catch (e) {
        results.push({ email, success: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ message: `${sent} enviados, ${failed} fallidos`, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Send admin email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
