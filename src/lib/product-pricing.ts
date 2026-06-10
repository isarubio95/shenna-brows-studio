export type ProductPricingFields = {
  price: number;
  is_on_sale?: boolean | null;
  sale_price?: number | null;
};

/** Oferta activa con precio de rebaja válido (mayor que 0 y menor que el precio habitual). */
export function isProductOnSale(product: ProductPricingFields): boolean {
  if (!product.is_on_sale) return false;
  const regular = Number(product.price);
  const sale = Number(product.sale_price);
  return Number.isFinite(regular) && Number.isFinite(sale) && sale > 0 && sale < regular;
}

/** Precio que paga el cliente (oferta o precio habitual). */
export function getEffectivePrice(product: ProductPricingFields): number {
  if (isProductOnSale(product)) return Number(product.sale_price);
  return Number(product.price);
}
