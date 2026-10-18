import type { Product as CartProduct } from "@/data/products";
import { getEffectivePrice, type ProductPricingFields } from "@/lib/product-pricing";

/** Columnas de `products` que necesita una línea del carrito. */
export type CartableProduct = ProductPricingFields & {
  id: string;
  name: string;
  slug: string;
  category: string;
  stock: number;
  image_url: string | null;
  description: string | null;
  materials: string | null;
  shipping_info: string | null;
  tagline: string | null;
  stripe_price_id?: string | null;
};

/** Mismo producto que añaden la tienda y la ficha, con el precio de oferta aplicado. */
export function toCartProduct(product: CartableProduct): CartProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    price: getEffectivePrice(product),
    stock: product.stock,
    image_url: product.image_url ?? "",
    description: product.description ?? "",
    materials: product.materials ?? "",
    shipping_info: product.shipping_info ?? "",
    tagline: product.tagline ?? "",
    stripe_price_id: product.stripe_price_id ?? "",
  };
}
