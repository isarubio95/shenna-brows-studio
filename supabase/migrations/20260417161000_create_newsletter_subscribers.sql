create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  is_subscribed boolean not null default true,
  privacy_accepted_at timestamptz not null default now(),
  source text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index if not exists newsletter_subscribers_email_unique_idx
  on public.newsletter_subscribers (email);

create index if not exists newsletter_subscribers_user_id_idx
  on public.newsletter_subscribers (user_id);

create index if not exists newsletter_subscribers_is_subscribed_idx
  on public.newsletter_subscribers (is_subscribed);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Admins can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can read newsletter subscribers"
  on public.newsletter_subscribers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists "Users can read own subscriber row" on public.newsletter_subscribers;
create policy "Users can read own subscriber row"
  on public.newsletter_subscribers
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own subscriber row" on public.newsletter_subscribers;
create policy "Users can update own subscriber row"
  on public.newsletter_subscribers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_newsletter_subscribers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger trg_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row
execute function public.set_newsletter_subscribers_updated_at();
