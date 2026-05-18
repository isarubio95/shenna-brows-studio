-- Entrega confirmada (Correos o manual) y marca de última consulta a trackpub
alter table public.orders
  add column if not exists delivered_at timestamptz;

alter table public.orders
  add column if not exists correos_tracking_synced_at timestamptz;

comment on column public.orders.delivered_at is
  'Momento en que el envío consta como entregado al destinatario.';

comment on column public.orders.correos_tracking_synced_at is
  'Última consulta del sincronizador a la API de seguimiento de Correos.';

create index if not exists orders_shipped_correos_tracking_idx
  on public.orders (correos_tracking_synced_at nulls first)
  where status = 'shipped' and correos_shipment_code is not null;
