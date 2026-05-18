// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  buildCorreosUrl,
  CORREOS_SERVICE_PATHS,
  type CorreosService,
} from "../_shared/correos.ts";
import {
  buildCorreosAuthorizedHeaders,
  getCorreosAccessToken,
} from "../_shared/correosAuth.ts";

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
      headers: buildCorreosAuthorizedHeaders(token),
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
