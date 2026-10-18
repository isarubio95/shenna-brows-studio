/**
 * Argumentos de venta de cada producto (`products.claims`): hasta cinco
 * líneas bajo «Añadir al carrito». La primera frase de cada línea se pinta en
 * negrita, como en la captura «¿Por qué elegir ELIXIR?» de la clienta.
 */
export const PRODUCT_CLAIMS_MAX = 5;

export interface ProductClaim {
  /** Primera frase, en negrita. */
  lead: string;
  /** Resto de la línea (puede ir vacío). */
  text: string;
}

/** Primera frase terminada en . ! ? o … y seguida de espacio (así «2.5 ml» no corta). */
const FIRST_SENTENCE_RE = /^(.+?[.!?…])\s+(\S[\s\S]*)$/;

export function productClaimLines(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, PRODUCT_CLAIMS_MAX);
}

export function parseProductClaims(raw: string | null | undefined): ProductClaim[] {
  return productClaimLines(raw).map((line) => {
    const match = line.match(FIRST_SENTENCE_RE);
    return match ? { lead: match[1], text: match[2].trim() } : { lead: line, text: "" };
  });
}

/** `null` cuando no hay ninguno, para no guardar cadenas vacías. */
export function serializeProductClaims(lines: string[]): string | null {
  const clean = lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, PRODUCT_CLAIMS_MAX);
  return clean.length > 0 ? clean.join("\n") : null;
}

export function productClaimsHeading(productName: string): string {
  return `¿Por qué elegir ${productName.trim()}?`;
}
