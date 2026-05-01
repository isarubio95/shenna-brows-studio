export const CORREOS_SERVICE_PATHS = {
  preregister: "/preregister",
  labels: "/labels",
  requests: "/requests",
  trackpub: "/trackpub",
} as const;

export type CorreosService = keyof typeof CORREOS_SERVICE_PATHS;
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function ensureLeadingSlash(value: string): string {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

export function buildCorreosUrl(path: string): string {
  const rawBase = Deno.env.get("CORREOS_API_BASE_URL") || "";
  if (!rawBase) {
    throw new Error("CORREOS_API_BASE_URL no está configurada");
  }

  const base = trimSlash(rawBase);
  const safePath = ensureLeadingSlash(path);
  return `${base}${safePath}`;
}

export function buildCorreosOAuthUrl(path: string): string {
  const explicitTokenUrl = Deno.env.get("CORREOS_OAUTH_TOKEN_URL") || "";
  if (explicitTokenUrl.trim().length > 0) {
    return explicitTokenUrl.trim();
  }

  const rawBase =
    Deno.env.get("CORREOS_OAUTH_BASE_URL") ||
    Deno.env.get("CORREOS_API_BASE_URL") ||
    "";
  if (!rawBase) {
    throw new Error("CORREOS_OAUTH_TOKEN_URL, CORREOS_OAUTH_BASE_URL o CORREOS_API_BASE_URL no está configurada");
  }

  const base = trimSlash(rawBase);
  const safePath = ensureLeadingSlash(path);
  return `${base}${safePath}`;
}

export function getOAuthTokenPath(): string {
  const tokenPath = Deno.env.get("CORREOS_OAUTH_TOKEN_PATH") || "/oauth/token";
  return ensureLeadingSlash(tokenPath);
}
