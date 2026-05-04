alter table public.orders
add column if not exists pending_cart_snapshot jsonb;

comment on column public.orders.pending_cart_snapshot is
  'Líneas del carrito al iniciar Redsys; usado en redsys-notify si falta o rompe Ds_Merchant_MerchantData.';
