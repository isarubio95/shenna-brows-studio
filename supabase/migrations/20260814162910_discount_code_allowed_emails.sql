-- Emails autorizados por código promocional.
-- Si un código no tiene filas aquí, es público (cualquiera puede usarlo).

create table if not exists public.discount_code_emails (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  constraint discount_code_emails_email_check check (position('@' in email) > 1)
);

create unique index if not exists discount_code_emails_code_email_uidx
  on public.discount_code_emails (discount_code_id, lower(email));

create index if not exists discount_code_emails_email_idx
  on public.discount_code_emails (lower(email));

create or replace function public.normalize_discount_code_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_discount_code_emails_normalize on public.discount_code_emails;
create trigger trg_discount_code_emails_normalize
before insert or update on public.discount_code_emails
for each row
execute function public.normalize_discount_code_email();

alter table public.discount_code_emails enable row level security;

drop policy if exists "Admins select discount code emails" on public.discount_code_emails;
create policy "Admins select discount code emails"
  on public.discount_code_emails
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins insert discount code emails" on public.discount_code_emails;
create policy "Admins insert discount code emails"
  on public.discount_code_emails
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins update discount code emails" on public.discount_code_emails;
create policy "Admins update discount code emails"
  on public.discount_code_emails
  for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins delete discount code emails" on public.discount_code_emails;
create policy "Admins delete discount code emails"
  on public.discount_code_emails
  for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
