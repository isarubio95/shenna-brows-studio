const VISITOR_KEY = "sb_visitor_id";

function generateVisitorId(): string {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) {
    return existing;
  }
  const next = generateVisitorId();
  localStorage.setItem(VISITOR_KEY, next);
  return next;
}

export function isCloudflareProtectionEnabled(): boolean {
  const raw = String(import.meta.env.VITE_ENABLE_CLOUDFLARE_PROTECTION ?? "true").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function getTurnstileSiteKey(): string {
  if (!isCloudflareProtectionEnabled()) return "";
  return import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
}
