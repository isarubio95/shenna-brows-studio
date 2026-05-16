-- Flag de devolución completada al 100 % (reembolso total)
alter table public.orders
  add column if not exists returned boolean not null default false;

comment on column public.orders.returned is
  'True cuando la devolución del pedido se ha completado por completo (reembolso total).';

update public.orders
set returned = true
where refund_status = 'full';
