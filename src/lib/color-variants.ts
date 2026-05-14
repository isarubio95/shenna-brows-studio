export type ColorVariant = {
  id: string;
  name: string;
  hex: string;
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
    out.push({ id, name, hex: hexNorm });
  }
  return out;
}

export function cartLineId(productId: string, variantId: string | null | undefined): string {
  return variantId ? `${productId}::${variantId}` : `${productId}::default`;
}
