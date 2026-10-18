/**
 * Bloques que el layout repite en las páginas de la tienda. La home los coloca
 * ella misma, en el orden de la clienta; la tienda pone a Elixir debajo de su
 * cabecera.
 */
export type StorefrontBlock = "trust" | "values" | "reviews";

export interface StorefrontLayout {
  /** Justo debajo del menú, antes de la primera imagen de la página. */
  top: StorefrontBlock[];
  /** Al final, antes del footer. */
  bottom: StorefrontBlock[];
}

const NONE: StorefrontLayout = { top: [], bottom: [] };

/** Compra, cuenta y panel: ahí los bloques de marketing solo distraen. */
const EXCLUDED_PREFIXES = ["/checkout", "/payment-success", "/payment-ko", "/login", "/account", "/admin"];

/** Valores y Elixir solo van en Inicio y Colección (petición de la clienta, 18/10). */
const SHOP_PATH = "/tienda";

/** Página de opiniones completa: el carrusel de reseñas sobraría. */
const REVIEWS_PAGE_PATH = "/testimonios";

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Bloques que el layout pinta arriba y al final de `pathname`. */
export function layoutStorefrontBlocks(pathname: string): StorefrontLayout {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return NONE;
  if (EXCLUDED_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) return NONE;

  if (path === SHOP_PATH) return { top: ["trust"], bottom: ["values", "reviews"] };
  if (path === REVIEWS_PAGE_PATH) return { top: ["trust"], bottom: [] };
  return { top: ["trust"], bottom: ["reviews"] };
}
