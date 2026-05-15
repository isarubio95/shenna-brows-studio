-- Solicitudes de devolución (flujo comercial) + seguimiento de reembolso en pedido
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  customer_note text,
  status text not null default 'requested',
  admin_note text,
  requested_amount numeric(10, 2),
  refunded_amount numeric(10, 2),
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint return_requests_reason_check check (
    reason in ('defective', 'wrong_product', 'changed_mind', 'other')
  ),
  constraint return_requests_status_check check (
    status in ('requested', 'approved', 'rejected', 'product_received', 'refunded', 'cancelled')
  )
);

create index if not exists return_requests_order_id_idx on public.return_requests (order_id);
create index if not exists return_requests_user_id_idx on public.return_requests (user_id);
create index if not exists return_requests_status_idx on public.return_requests (status);

-- Una solicitud activa por pedido
create unique index if not exists return_requests_one_active_per_order_idx
  on public.return_requests (order_id)
  where status in ('requested', 'approved', 'product_received');

alter table public.orders
  add column if not exists refund_status text not null default 'none',
  add column if not exists redsys_auth_code text;

alter table public.orders
  drop constraint if exists orders_refund_status_check;

alter table public.orders
  add constraint orders_refund_status_check check (
    refund_status in ('none', 'partial', 'full')
  );

comment on table public.return_requests is 'Solicitudes de devolución de producto; el reembolso bancario se gestiona en Redsys Canales.';
comment on column public.orders.stripe_session_id is 'Número de pedido Redsys (Ds_Merchant_Order) para consultas y devoluciones en Canales.';
comment on column public.orders.redsys_auth_code is 'Código de autorización Redsys (Ds_AuthorisationCode) de la operación de cobro.';

alter table public.return_requests enable row level security;

drop policy if exists "Users read own return requests" on public.return_requests;
create policy "Users read own return requests"
  on public.return_requests
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins read all return requests" on public.return_requests;
create policy "Admins read all return requests"
  on public.return_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

drop policy if exists "Admins update return requests" on public.return_requests;
create policy "Admins update return requests"
  on public.return_requests
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

drop policy if exists "Users cancel own pending return requests" on public.return_requests;
create policy "Users cancel own pending return requests"
  on public.return_requests
  for update
  to authenticated
  using (user_id = auth.uid() and status = 'requested')
  with check (user_id = auth.uid() and status = 'cancelled');

create or replace function public.set_return_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_return_requests_updated_at on public.return_requests;
create trigger trg_return_requests_updated_at
before update on public.return_requests
for each row
execute function public.set_return_requests_updated_at();
