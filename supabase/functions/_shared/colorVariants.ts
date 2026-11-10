/**
 * Variantes de color de `products.color_variants` y validación de la elección al pagar.
 * Agrupa igual que `src/lib/color-variants.ts`, que es lo que ve la clienta en la ficha.
 */
export type ColorVariant = { id: string; name: string; hex: string; group?: string };
export type ColorVariantGroup = { key: string; name: string; variants: ColorVariant[] };

export function normalizeHexStrict(raw: string): string | null {
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

export function parseColorVariantsFromDb(raw: unknown): ColorVariant[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: ColorVariant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = String(o.id ?? "").trim();
    const name = String(o.name ?? "").trim();
    const hex = normalizeHexStrict(String(o.hex ?? ""));
    if (!id || !name || !hex) continue;
    const group = typeof o.group === "string" ? o.group.trim() : "";
    out.push(group ? { id, name, hex, group } : { id, name, hex });
  }
  return out;
}

const groupKey = (group: string | undefined) =>
  (group ?? "").trim().toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");

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

export type VariantChoice =
  | { ok: true; chosen: ColorVariant[] }
  | { ok: false; error: string };

/**
 * Comprueba que una línea del carrito elige exactamente una variante de cada grupo del
 * producto y devuelve las elegidas en el orden de los grupos. Sin variantes, no pide nada.
 */
export function resolveVariantChoice(
  productName: string,
  variants: readonly ColorVariant[],
  requestedIds: readonly string[],
): VariantChoice {
  if (variants.length === 0) return { ok: true, chosen: [] };

  const ids = requestedIds.map((id) => String(id).trim()).filter(Boolean);
  if (ids.some((id) => !variants.some((v) => v.id === id)) || new Set(ids).size !== ids.length) {
    return { ok: false, error: "Color de producto no válido" };
  }

  const chosen: ColorVariant[] = [];
  for (const group of groupColorVariants(variants)) {
    const picked = group.variants.filter((v) => ids.includes(v.id));
    if (picked.length === 0) {
      return {
        ok: false,
        error: group.name
          ? `Debes elegir una opción de «${group.name}» para: ${productName}`
          : `Debes elegir un color para: ${productName}`,
      };
    }
    if (picked.length > 1) return { ok: false, error: "Color de producto no válido" };
    chosen.push(picked[0]);
  }
  return { ok: true, chosen };
}

/** Ids de variante de una línea: `colorVariantIds` o, en carritos antiguos, `colorVariantId`. */
export function requestedVariantIds(line: { colorVariantIds?: unknown; colorVariantId?: unknown }): string[] {
  if (Array.isArray(line.colorVariantIds)) {
    return line.colorVariantIds.map((id) => String(id ?? "").trim()).filter(Boolean);
  }
  const single = line.colorVariantId != null ? String(line.colorVariantId).trim() : "";
  return single ? [single] : [];
}
