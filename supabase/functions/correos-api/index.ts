// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  buildCorreosOAuthUrl,
  buildCorreosUrl,
  CORREOS_SERVICE_PATHS,
  type CorreosService,
  getOAuthTokenPath,
} from "../_shared/correos.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestPayload = {
  service: CorreosService;
  endpoint?: string;
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  token?: string;
};

function buildQueryString(query?: RequestPayload["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.set(key, String(value));
  }
  const rendered = params.toString();
  return rendered ? `?${rendered}` : "";
}

function sanitizeEndpoint(endpoint?: string): string {
  if (!endpoint) return "";
  const trimmed = endpoint.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function getCorreosAccessToken(): Promise<string> {
  const clientId = Deno.env.get("CORREOS_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("CORREOS_CLIENT_SECRET") || "";
  const scope = Deno.env.get("CORREOS_OAUTH_SCOPE") || "";

  if (!clientId || !clientSecret) {
    throw new Error("Faltan CORREOS_CLIENT_ID o CORREOS_CLIENT_SECRET");
  }

  const tokenUrl = buildCorreosOAuthUrl(getOAuthTokenPath());
  const baseBody = new URLSearchParams({ grant_type: "client_credentials" });
  if (scope) baseBody.set("scope", scope);

  const attempts: Array<{
    label: string;
    headers: Record<string, string>;
    body: string;
  }> = [
    {
      label: "form-body-client-credentials",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        ...(scope ? { scope } : {}),
      }).toString(),
    },
    {
      label: "form-basic-auth",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: baseBody.toString(),
    },
    {
      label: "json-body-client-credentials",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        ...(scope ? { scope } : {}),
      }),
    },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: attempt.headers,
      body: attempt.body,
    });

    const raw = await response.text();
    const data = (() => {
      try {
        return JSON.parse(raw || "{}") as
          | { access_token?: string; token_type?: string; expires_in?: number }
          | Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    })();

    if (response.ok && typeof data?.access_token === "string") {
      return data.access_token;
    }

    const detail = raw ? raw.slice(0, 240) : "sin detalle";
    errors.push(`${attempt.label}: ${response.status} (${detail})`);
  }

  if (errors.length > 0) {
    throw new Error(`No se pudo obtener token de Correos. Intentos: ${errors.join(" | ")}`);
  }
  throw new Error("No se pudo obtener token de Correos");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método no permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json() as RequestPayload;
    const servicePath = CORREOS_SERVICE_PATHS[payload.service];

    if (!servicePath) {
      return new Response(JSON.stringify({ error: "Servicio de Correos no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = (payload.method || "POST").toUpperCase();
    const endpoint = sanitizeEndpoint(payload.endpoint);
    const query = buildQueryString(payload.query);
    const url = buildCorreosUrl(`${servicePath}${endpoint}${query}`);
    const token = payload.token || await getCorreosAccessToken();

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: method === "GET" ? undefined : JSON.stringify(payload.body ?? {}),
    });

    const raw = await response.text();
    return new Response(raw, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("correos-api error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
