import productPinzas from "@/assets/product-pinzas.jpg";
import productTijeras from "@/assets/product-tijeras.jpg";
import productEspuma from "@/assets/product-espuma.jpg";
import productStick from "@/assets/product-stick.jpg";
import productLapiz from "@/assets/product-lapiz.jpg";

const localFallbacks: Record<string, string> = {
  pinzas: productPinzas,
  tijeras: productTijeras,
  espuma: productEspuma,
  stick: productStick,
  lapiz: productLapiz,
};

const isNonEmptyUrl = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeEntryUrl = (entry: unknown): string | null => {
  if (isNonEmptyUrl(entry)) return entry.trim();
  if (entry && typeof entry === "object" && isNonEmptyUrl((entry as { url?: unknown }).url)) {
    return (entry as { url: string }).url.trim();
  }
  return null;
};

/**
 * Parse `products.image_url`: plain URL, `string[]`, or legacy `{ url, fill }[]`.
 */
export const parseProductImages = (imageUrl: string | null | undefined): string[] => {
  if (!imageUrl) return [];
  const normalized = imageUrl.trim();
  if (!normalized) return [];

  if (normalized.startsWith("[")) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeEntryUrl).filter((entry): entry is string => entry !== null);
      }
    } catch {
      // Fallback to legacy plain string format when parsing fails.
    }
  }

  return [normalized];
};

export const serializeProductImages = (urls: string[]): string | null => {
  if (urls.length === 0) return null;
  return JSON.stringify(urls);
};

/**
 * Resolves the display image for a product following strict priority:
 * 1. Dynamic URL from Supabase (if not placeholder/null)
 * 2. Local fallback by slug
 * 3. /placeholder.svg
 */
export const getProductImageUrl = (imageUrl: string | null | undefined, slug: string): string => {
  const firstDynamicImage = parseProductImages(imageUrl)[0];
  if (firstDynamicImage && firstDynamicImage !== "/placeholder.svg") return firstDynamicImage;
  return localFallbacks[slug] || "/placeholder.svg";
};

export const getProductImageGallery = (imageUrl: string | null | undefined, slug: string): string[] => {
  const gallery = parseProductImages(imageUrl).filter((entry) => entry !== "/placeholder.svg");
  if (gallery.length > 0) return gallery;
  return [localFallbacks[slug] || "/placeholder.svg"];
};
