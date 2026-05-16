import { buildCorreosOAuthUrl, getOAuthTokenPath } from "./correos.ts";

export function getCorreosApiClientHeaders(): Record<string, string> {
  const apiClientId =
    Deno.env.get("CORREOS_API_CLIENT_ID") ||
    Deno.env.get("CORREOS_CLIENT_ID") ||
    "";
  const apiClientSecret =
    Deno.env.get("CORREOS_API_CLIENT_SECRET") ||
    Deno.env.get("CORREOS_CLIENT_SECRET") ||
    "";

  return {
    ...(apiClientId
      ? {
          client_id: apiClientId,
          "x-ibm-client-id": apiClientId,
        }
      : {}),
    ...(apiClientSecret
      ? {
          client_secret: apiClientSecret,
          "x-ibm-client-secret": apiClientSecret,
        }
      : {}),
  };
}

export async function getCorreosAccessToken(): Promise<string> {
  const clientId =
    Deno.env.get("CORREOS_OAUTH_CLIENT_ID") ||
    Deno.env.get("CORREOS_CLIENT_ID") ||
    "";
  const clientSecret =
    Deno.env.get("CORREOS_OAUTH_CLIENT_SECRET") ||
    Deno.env.get("CORREOS_CLIENT_SECRET") ||
    "";
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
        return JSON.parse(raw || "{}") as {
          access_token?: string;
          idToken?: string;
        };
      } catch {
        return {};
      }
    })();

    const bearerToken =
      typeof data.access_token === "string"
        ? data.access_token
        : typeof data.idToken === "string"
          ? data.idToken
          : null;

    if (response.ok && bearerToken) {
      return bearerToken;
    }

    const detail = raw ? raw.slice(0, 240) : "sin detalle";
    errors.push(`${attempt.label}: ${response.status} (${detail})`);
  }

  throw new Error(`No se pudo obtener token de Correos en ${tokenUrl}. Intentos: ${errors.join(" | ")}`);
}

export function buildCorreosAuthorizedHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...getCorreosApiClientHeaders(),
  };
}
