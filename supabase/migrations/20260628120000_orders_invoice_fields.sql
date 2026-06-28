ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_tax_id text;

COMMENT ON COLUMN public.orders.invoice_requested IS 'El cliente solicitó factura en el checkout';
COMMENT ON COLUMN public.orders.customer_tax_id IS 'NIF/CIF del cliente para la factura';
