/** Debe coincidir con `src/data/shipping-provinces.ts` (importación cruzada no disponible en Edge). */

export function normalizeProvinceCode(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "PT") return "PT";
  const m = s.match(/^0*(\d{1,2})$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (n < 1 || n > 52) return null;
  return String(n).padStart(2, "0");
}

function normalizeShippingCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Debe coincidir con `qualifiesForFreeLogronoShipping` en shipping-provinces.ts */
function qualifiesForFreeLogronoShipping(provinceCode: string, city: string): boolean {
  if (provinceCode !== "26") return false;
  return normalizeShippingCity(city) === "logrono";
}

export function shippingEurForNormalizedProvinceCode(code: string): number | null {
  if (code === "PT") return 11;
  if (code === "07") return 10;
  if (code === "35" || code === "38") return 15;
  const n = Number.parseInt(code, 10);
  if (n >= 1 && n <= 52) return 7;
  return null;
}

export function shippingEurForShippingAddress(
  provinceCode: string,
  city: string,
): number | null {
  if (qualifiesForFreeLogronoShipping(provinceCode, city)) return 0;
  return shippingEurForNormalizedProvinceCode(provinceCode);
}
