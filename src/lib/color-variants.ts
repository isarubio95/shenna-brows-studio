export type ColorVariant = {
  id: string;
  name: string;
  hex: string;
  /**
   * Qué se elige con esta variante (p. ej. «Lápiz» o «Herramientas»). Un pack con dos grupos
   * pide una variante de cada uno; sin grupo, todas las variantes son un único «Color».
   */
  group?: string;
};

export type ColorVariantGroup = {
  /** Nombre normalizado: «Lápiz» y «lapiz » son el mismo grupo. */
  key: string;
  /** Nombre tal y como se escribió la primera vez; vacío en el grupo sin nombre. */
  name: string;
  variants: ColorVariant[];
};

/** Normaliza a `#RRGGBB` o devuelve null si no es un hex válido. Acepta con o sin `#` y forma corta `#RGB`. */
export function normalizeHex(raw: string): string | null {
  let s = (raw || "").trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(s);
  if (!m) return null;
  const body = m[1];
  if (body.length === 3) {
    const [a, b, c] = body.split("");
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase();
  }
  return `#${body.toUpperCase()}`;
}

export function parseColorVariants(value: unknown): ColorVariant[] {
  if (!value) return [];
  let arr: unknown[] = [];
  if (Array.isArray(value)) arr = value;
  else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return [];
    }
  } else return [];

  const out: ColorVariant[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = String(o.id ?? "").trim();
    const name = String(o.name ?? "").trim();
    const hexNorm = normalizeHex(String(o.hex ?? ""));
    if (!id || !name || !hexNorm) continue;
    const group = typeof o.group === "string" ? o.group.trim() : "";
    out.push(group ? { id, name, hex: hexNorm, group } : { id, name, hex: hexNorm });
  }
  return out;
}

const groupKey = (group: string | undefined) =>
  (group ?? "").trim().toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Agrupa las variantes en el orden en que aparecen. Debe agrupar igual que
 * `supabase/functions/_shared/colorVariants.ts`, que valida la elección al pagar.
 */
export function groupColorVariants(variants: readonly ColorVariant[]): ColorVariantGroup[] {
  const groups: ColorVariantGroup[] = [];
  for (const variant of variants) {
    const key = groupKey(variant.group);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, name: (variant.group ?? "").trim(), variants: [] };
      groups.push(group);
    }
    group.variants.push(variant);
  }
  return groups;
}

/** Una línea del carrito por producto y combinación de variantes. */
export function cartLineId(productId: string, variantIds: readonly string[]): string {
  return variantIds.length ? `${productId}::${variantIds.join("+")}` : `${productId}::default`;
}
