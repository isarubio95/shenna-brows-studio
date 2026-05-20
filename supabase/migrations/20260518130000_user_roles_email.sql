-- Correo en user_roles para identificar usuarios en el panel
alter table public.user_roles
  add column if not exists email text;

update public.user_roles ur
set email = u.email
from auth.users u
where ur.user_id = u.id
  and (ur.email is null or ur.email is distinct from u.email);

alter table public.user_roles
  alter column email set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role, email)
  values (new.id, 'customer', new.email);
  return new;
end;
$$;

create or replace function public.user_roles_set_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.email is null then
    select u.email
    into new.email
    from auth.users u
    where u.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_roles_set_email on public.user_roles;
create trigger trg_user_roles_set_email
before insert or update on public.user_roles
for each row
execute function public.user_roles_set_email();

create or replace function public.sync_user_roles_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.email is distinct from old.email then
    update public.user_roles
    set email = new.email
    where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute function public.sync_user_roles_email();
