ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price numeric(10, 2) NULL;

COMMENT ON COLUMN public.products.is_on_sale IS 'Si true y sale_price es válido, el producto se muestra en oferta.';
COMMENT ON COLUMN public.products.sale_price IS 'Precio de oferta en EUR; debe ser menor que price.';
