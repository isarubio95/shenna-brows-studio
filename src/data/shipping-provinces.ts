/**
 * Tarifas de envío (EUR) por zona. Códigos INE de provincia (01–52) y PT para Portugal.
 * Península y Ceuta/Melilla: 7 € · Illes Balears: 10 € · Canarias: 15 € · Portugal: 11 €
 */
export const SHIPPING_RATES_EUR = {
  peninsula: 7,
  baleares: 10,
  canarias: 15,
  portugal: 11,
} as const;

export type ShippingZoneKey = keyof typeof SHIPPING_RATES_EUR;

export function shippingZoneForProvinceCode(code: string): ShippingZoneKey | null {
  const c = code.trim().toUpperCase();
  if (c === "PT") return "portugal";
  if (c === "07") return "baleares";
  if (c === "35" || c === "38") return "canarias";
  if (!/^\d{1,2}$/.test(c)) return null;
  const n = Number.parseInt(c, 10);
  if (n < 1 || n > 52) return null;
  return "peninsula";
}

const LA_RIOJA_PROVINCE_CODE = "26";

/** Normaliza localidad para comparar (sin acentos, minúsculas). */
export function normalizeShippingCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Envío gratuito: provincia La Rioja (26) y localidad Logroño. */
export function qualifiesForFreeLogronoShipping(
  provinceCode: string | undefined | null,
  city: string | undefined | null,
): boolean {
  const code = (provinceCode ?? "").trim().toUpperCase();
  if (code !== LA_RIOJA_PROVINCE_CODE) return false;
  return normalizeShippingCity(city ?? "") === "logrono";
}

export function getShippingEurForProvinceCode(
  code: string | undefined | null,
  city?: string | undefined | null,
): number | null {
  if (!code) return null;
  if (qualifiesForFreeLogronoShipping(code, city)) return 0;
  const z = shippingZoneForProvinceCode(code);
  return z ? SHIPPING_RATES_EUR[z] : null;
}

export type ProvinceOption = { code: string; label: string; ccaa: string };

/** Provincias españolas (INE) + Portugal; `ccaa` agrupa el desplegable. */
export const PROVINCE_OPTIONS: ProvinceOption[] = [
  { code: "04", label: "Almería", ccaa: "Andalucía" },
  { code: "11", label: "Cádiz", ccaa: "Andalucía" },
  { code: "14", label: "Córdoba", ccaa: "Andalucía" },
  { code: "18", label: "Granada", ccaa: "Andalucía" },
  { code: "21", label: "Huelva", ccaa: "Andalucía" },
  { code: "23", label: "Jaén", ccaa: "Andalucía" },
  { code: "29", label: "Málaga", ccaa: "Andalucía" },
  { code: "41", label: "Sevilla", ccaa: "Andalucía" },
  { code: "22", label: "Huesca", ccaa: "Aragón" },
  { code: "44", label: "Teruel", ccaa: "Aragón" },
  { code: "50", label: "Zaragoza", ccaa: "Aragón" },
  { code: "33", label: "Asturias", ccaa: "Principado de Asturias" },
  { code: "07", label: "Illes Balears", ccaa: "Illes Balears" },
  { code: "35", label: "Las Palmas", ccaa: "Canarias" },
  { code: "38", label: "Santa Cruz de Tenerife", ccaa: "Canarias" },
  { code: "39", label: "Cantabria", ccaa: "Cantabria" },
  { code: "05", label: "Ávila", ccaa: "Castilla y León" },
  { code: "09", label: "Burgos", ccaa: "Castilla y León" },
  { code: "24", label: "León", ccaa: "Castilla y León" },
  { code: "34", label: "Palencia", ccaa: "Castilla y León" },
  { code: "37", label: "Salamanca", ccaa: "Castilla y León" },
  { code: "40", label: "Segovia", ccaa: "Castilla y León" },
  { code: "42", label: "Soria", ccaa: "Castilla y León" },
  { code: "47", label: "Valladolid", ccaa: "Castilla y León" },
  { code: "49", label: "Zamora", ccaa: "Castilla y León" },
  { code: "02", label: "Albacete", ccaa: "Castilla-La Mancha" },
  { code: "13", label: "Ciudad Real", ccaa: "Castilla-La Mancha" },
  { code: "16", label: "Cuenca", ccaa: "Castilla-La Mancha" },
  { code: "19", label: "Guadalajara", ccaa: "Castilla-La Mancha" },
  { code: "45", label: "Toledo", ccaa: "Castilla-La Mancha" },
  { code: "08", label: "Barcelona", ccaa: "Cataluña" },
  { code: "17", label: "Girona", ccaa: "Cataluña" },
  { code: "25", label: "Lleida", ccaa: "Cataluña" },
  { code: "43", label: "Tarragona", ccaa: "Cataluña" },
  { code: "51", label: "Ceuta", ccaa: "Ceuta" },
  { code: "03", label: "Alicante / Alacant", ccaa: "Comunidad Valenciana" },
  { code: "12", label: "Castelló / Castellón", ccaa: "Comunidad Valenciana" },
  { code: "46", label: "València / Valencia", ccaa: "Comunidad Valenciana" },
  { code: "06", label: "Badajoz", ccaa: "Extremadura" },
  { code: "10", label: "Cáceres", ccaa: "Extremadura" },
  { code: "15", label: "A Coruña", ccaa: "Galicia" },
  { code: "27", label: "Lugo", ccaa: "Galicia" },
  { code: "32", label: "Ourense", ccaa: "Galicia" },
  { code: "36", label: "Pontevedra", ccaa: "Galicia" },
  { code: "26", label: "La Rioja", ccaa: "La Rioja" },
  { code: "28", label: "Madrid", ccaa: "Madrid" },
  { code: "52", label: "Melilla", ccaa: "Melilla" },
  { code: "30", label: "Murcia", ccaa: "Región de Murcia" },
  { code: "31", label: "Navarra", ccaa: "Navarra" },
  { code: "01", label: "Araba / Álava", ccaa: "País Vasco" },
  { code: "48", label: "Bizkaia", ccaa: "País Vasco" },
  { code: "20", label: "Gipuzkoa", ccaa: "País Vasco" },
  { code: "PT", label: "Portugal (todas las zonas)", ccaa: "Portugal" },
];

const provinceByCode = new Map(PROVINCE_OPTIONS.map((p) => [p.code, p]));

export function getProvinceOptionByCode(code: string): ProvinceOption | undefined {
  return provinceByCode.get(code.trim().toUpperCase());
}

/** Agrupa por CCAA y ordena etiquetas (es). Portugal al final. */
export function getProvinceOptionsGrouped(): Array<{ ccaa: string; provinces: ProvinceOption[] }> {
  const byCcaa = new Map<string, ProvinceOption[]>();
  for (const p of PROVINCE_OPTIONS) {
    const list = byCcaa.get(p.ccaa) ?? [];
    list.push(p);
    byCcaa.set(p.ccaa, list);
  }
  for (const list of byCcaa.values()) {
    list.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }
  const entries = [...byCcaa.entries()].sort(([a], [b]) => {
    if (a === "Portugal") return 1;
    if (b === "Portugal") return -1;
    return a.localeCompare(b, "es");
  });
  return entries.map(([ccaa, provinces]) => ({ ccaa, provinces }));
}

export const SHIPPING_PRICE_LEGEND =
  "Península y ciudades autónomas (salvo Canarias/Baleares) 7 € · Illes Balears 10 € · Canarias 15 € · Portugal 11 € · Envío gratuito en Logroño (La Rioja).";
