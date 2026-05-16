alter table public.orders
  add column if not exists delivered_email_sent_at timestamptz;

comment on column public.orders.delivered_email_sent_at is
  'Momento en que se envió al cliente el correo de pedido entregado (valoración e Instagram).';
