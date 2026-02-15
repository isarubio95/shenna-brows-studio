import productPinzas from "@/assets/product-pinzas.jpg";
import productTijeras from "@/assets/product-tijeras.jpg";
import productGel from "@/assets/product-gel.jpg";

const localFallbacks: Record<string, string> = {
  pinzas: productPinzas,
  tijeras: productTijeras,
  gel: productGel,
};

/**
 * Resolves the display image for a product following strict priority:
 * 1. Dynamic URL from Supabase (if not placeholder/null)
 * 2. Local fallback by slug
 * 3. /placeholder.svg
 */
export const getProductImageUrl = (imageUrl: string | null | undefined, slug: string): string => {
  if (imageUrl && imageUrl !== "/placeholder.svg") return imageUrl;
  return localFallbacks[slug] || "/placeholder.svg";
};
