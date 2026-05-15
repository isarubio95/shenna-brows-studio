-- Marca explícita de envío (admin) antes de permitir devoluciones al cliente
alter table public.orders
  add column if not exists shipped_at timestamptz;

comment on column public.orders.shipped_at is
  'Momento en que el admin confirmó el envío; el cliente deja de poder cancelar el pedido directamente.';
