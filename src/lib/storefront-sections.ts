/**
 * Bloques que se repiten en todas las páginas de la tienda (petición de la
 * clienta: «que entren donde entren aparezcan»). El layout los pinta antes del
 * footer; la home los coloca ella misma, en el orden de su esquema.
 */
export type StorefrontBlock = "trust" | "values" | "spotlight" | "reviews";

export const STOREFRONT_BLOCK_ORDER: readonly StorefrontBlock[] = [
  "trust",
  "values",
  "spotlight",
  "reviews",
];

/** Compra, cuenta y panel: ahí los bloques de marketing solo distraen. */
const EXCLUDED_PREFIXES = ["/checkout", "/payment-success", "/payment-ko", "/login", "/account", "/admin"];

/** Página de opiniones completa: el carrusel de reseñas sobraría. */
const REVIEWS_PAGE_PATH = "/testimonios";

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Bloques que el layout debe pintar al final de `pathname`. */
export function layoutStorefrontBlocks(
  pathname: string,
  { spotlightSlug }: { spotlightSlug?: string | null } = {},
): StorefrontBlock[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return [];
  if (EXCLUDED_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) return [];

  return STOREFRONT_BLOCK_ORDER.filter((block) => {
    if (block === "reviews") return path !== REVIEWS_PAGE_PATH;
    // En la propia ficha del producto protagonista sería repetir lo que ya se ve.
    if (block === "spotlight") return !spotlightSlug || path !== `/${spotlightSlug}`;
    return true;
  });
}
