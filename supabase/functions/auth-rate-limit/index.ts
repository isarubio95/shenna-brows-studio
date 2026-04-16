import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Redis } from "npm:@upstash/redis@1.35.6";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { sha256Hex, verifyTurnstileToken } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-visitor-id",
};

const LOCKOUT_WINDOW_SECONDS = 10 * 60;
const LOCKOUT_SECONDS = 15 * 60;
const LOCKOUT_THRESHOLD = 5;
const redis = Redis.fromEnv();

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

  try {
    const body = await req.json();
    const { action, email, success, turnstileToken } = body as {
      action?: "precheck" | "report";
      email?: string;
      success?: boolean;
      turnstileToken?: string;
    };

    if (!action || !email) {
      return new Response(JSON.stringify({ error: "Missing action or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailHash = await sha256Hex(normalizedEmail);
    const ip = getClientIp(req);
    const visitorId = req.headers.get("x-visitor-id")?.trim() || "anonymous";

    const ipLimit = await applyRateLimit({
      endpoint: "auth-rate-limit",
      kind: "ip",
      key: ip,
      limit: 15,
      window: "1 m",
    });

    if (!ipLimit.success) {
      return new Response(JSON.stringify({ error: "Too many authentication attempts" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...rateLimitHeaders(ipLimit),
        },
      });
    }

    const identityLimit = await applyRateLimit({
      endpoint: "auth-rate-limit",
      kind: "identity",
      key: visitorId,
      limit: 20,
      window: "1 m",
    });

    if (!identityLimit.success) {
      return new Response(JSON.stringify({ error: "Too many authentication attempts" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...rateLimitHeaders(identityLimit),
        },
      });
    }

    if (action === "precheck") {
      if (!turnstileToken) {
        return new Response(JSON.stringify({ error: "Missing Turnstile token" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validTurnstile = await verifyTurnstileToken(turnstileToken, ip);
      if (!validTurnstile) {
        return new Response(JSON.stringify({ error: "Bot challenge failed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const lockedUntilRaw = await redis.get<string>(`auth:lockout:${emailHash}`);
      const lockedUntil = lockedUntilRaw ? Number(lockedUntilRaw) : 0;
      const now = Date.now();
      if (lockedUntil > now) {
        return new Response(
          JSON.stringify({
            error: "Account temporarily locked",
            unlockAt: new Date(lockedUntil).toISOString(),
          }),
          {
            status: 423,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "report") {
      const failuresKey = `auth:failures:${emailHash}`;
      const lockoutKey = `auth:lockout:${emailHash}`;

      if (success) {
        await redis.del(failuresKey);
        await redis.del(lockoutKey);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const failures = await redis.incr(failuresKey);
      if (failures === 1) {
        await redis.expire(failuresKey, LOCKOUT_WINDOW_SECONDS);
      }

      if (failures >= LOCKOUT_THRESHOLD) {
        const lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
        await redis.set(lockoutKey, String(lockedUntil), { ex: LOCKOUT_SECONDS });
        await redis.del(failuresKey);
        return new Response(
          JSON.stringify({
            ok: false,
            locked: true,
            unlockAt: new Date(lockedUntil).toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ ok: false, locked: false, failures }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
