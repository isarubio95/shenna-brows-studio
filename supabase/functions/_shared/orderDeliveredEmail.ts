/** URLs que usan los emails a clientas (el texto vive en customerEmails.ts). */

export const SHENNA_INSTAGRAM_URL = "https://www.instagram.com/shennabrows/";

export function getPublicSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL")?.trim() || "https://shennabrows.com";
  return raw.replace(/\/+$/, "");
}

export function buildAccountReviewUrl(siteUrl?: string): string {
  const base = (siteUrl ?? getPublicSiteUrl()).replace(/\/+$/, "");
  return `${base}/account#tu-experiencia`;
}
