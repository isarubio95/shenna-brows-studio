-- Códigos promocionales + columnas de uso en pedidos y newsletter welcome.

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type text not null default 'fixed',
  discount_value numeric(10, 2) not null,
  min_subtotal numeric(10, 2),
  max_uses integer,
  max_uses_per_email integer,
  first_order_only boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  is_welcome_offer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_codes_type_check check (discount_type in ('fixed', 'percent')),
  constraint discount_codes_value_check check (discount_value > 0),
  constraint discount_codes_percent_check check (
    discount_type <> 'percent' or discount_value <= 100
  ),
  constraint discount_codes_min_subtotal_check check (
    min_subtotal is null or min_subtotal >= 0
  ),
  constraint discount_codes_max_uses_check check (
    max_uses is null or max_uses > 0
  ),
  constraint discount_codes_max_uses_per_email_check check (
    max_uses_per_email is null or max_uses_per_email > 0
  )
);

create unique index if not exists discount_codes_code_unique_idx
  on public.discount_codes (upper(code));

create unique index if not exists discount_codes_one_welcome_offer_idx
  on public.discount_codes (is_welcome_offer)
  where is_welcome_offer = true and is_active = true;

create index if not exists discount_codes_is_active_idx
  on public.discount_codes (is_active);

create or replace function public.set_discount_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.code = upper(trim(new.code));
  return new;
end;
$$;

drop trigger if exists trg_discount_codes_updated_at on public.discount_codes;
create trigger trg_discount_codes_updated_at
before insert or update on public.discount_codes
for each row
execute function public.set_discount_codes_updated_at();

alter table public.discount_codes enable row level security;

drop policy if exists "Admins select discount codes" on public.discount_codes;
create policy "Admins select discount codes"
  on public.discount_codes
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins insert discount codes" on public.discount_codes;
create policy "Admins insert discount codes"
  on public.discount_codes
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins update discount codes" on public.discount_codes;
create policy "Admins update discount codes"
  on public.discount_codes
  for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins delete discount codes" on public.discount_codes;
create policy "Admins delete discount codes"
  on public.discount_codes
  for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- Pedidos: snapshot del cupón aplicado
alter table public.orders
  add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric(10, 2);

create index if not exists orders_discount_code_id_idx
  on public.orders (discount_code_id)
  where discount_code_id is not null;

-- Newsletter: no reenviar email de cupón welcome
alter table public.newsletter_subscribers
  add column if not exists welcome_coupon_sent_at timestamptz;

-- Semilla: oferta de bienvenida del popup
insert into public.discount_codes (
  code,
  description,
  discount_type,
  discount_value,
  min_subtotal,
  max_uses_per_email,
  first_order_only,
  is_active,
  is_welcome_offer
)
select
  'BIENVENIDA10',
  '10€ de descuento en tu primer pedido (mín. 50€). Oferta del popup de bienvenida.',
  'fixed',
  10,
  50,
  1,
  true,
  true,
  true
where not exists (
  select 1 from public.discount_codes where upper(code) = 'BIENVENIDA10'
);
