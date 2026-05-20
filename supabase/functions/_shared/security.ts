export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Misma semántica que `VITE_ENABLE_CLOUDFLARE_PROTECTION` en el front: en Supabase usar `ENABLE_CLOUDFLARE_PROTECTION=false`. */
export function isCloudflareProtectionEnabled(): boolean {
  const raw = Deno.env.get("ENABLE_CLOUDFLARE_PROTECTION") ?? "true";
  const value = raw.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!isCloudflareProtectionEnabled()) {
    return true;
  }

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY is not configured; bypassing challenge.");
    return true;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return false;
  }

  // No enviamos remoteip: en móvil, WebViews (Instagram, etc.) y proxies la IP
  // que ve Supabase suele no coincidir con la del desafío y siteverify falla.
  const body = new URLSearchParams({
    secret,
    response: trimmed,
  });

  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!verification.ok) {
    console.warn("turnstile_siteverify_http_error", { status: verification.status });
    return false;
  }

  const payload = await verification.json() as {
    success?: boolean;
    "error-codes"?: string[];
  };
  if (!payload.success) {
    console.warn("turnstile_siteverify_failed", { errorCodes: payload["error-codes"] ?? [] });
  }
  return Boolean(payload.success);
}
