-- La vista profiles_public_view se creó como SECURITY DEFINER (el default de
-- Postgres), así que ignora el RLS de `profiles` y `testimonials`. Eso permite
-- a cualquiera con la anon key leer todos los testimonios y los nombres, no
-- solo los destacados.
--
-- Recreamos la vista con security_invoker=true y copiamos el nombre público
-- en `testimonials.author_name` para no tener que abrir la tabla `profiles`
-- (email, teléfono, dirección) al público.

alter table public.testimonials
  add column if not exists author_name text;

update public.testimonials t
set author_name = p.full_name
from public.profiles p
where p.user_id = t.user_id
  and t.author_name is distinct from p.full_name;

create or replace function public.testimonials_set_author_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.full_name
    into new.author_name
  from public.profiles p
  where p.user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_testimonials_set_author_name on public.testimonials;
create trigger trg_testimonials_set_author_name
before insert or update of user_id on public.testimonials
for each row
execute function public.testimonials_set_author_name();

create or replace function public.sync_testimonial_author_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.testimonials
  set author_name = new.full_name
  where user_id = new.user_id
    and author_name is distinct from new.full_name;

  return new;
end;
$$;

drop trigger if exists trg_sync_testimonial_author_name on public.profiles;
create trigger trg_sync_testimonial_author_name
after insert or update of full_name on public.profiles
for each row
execute function public.sync_testimonial_author_name();

revoke all on function public.testimonials_set_author_name() from public, anon, authenticated;
revoke all on function public.sync_testimonial_author_name() from public, anon, authenticated;

drop view if exists public.profiles_public_view;

create view public.profiles_public_view
with (security_invoker = true)
as
select
  t.author_name as full_name,
  t.content,
  t.is_featured,
  t.created_at
from public.testimonials t;

revoke all on public.profiles_public_view from public, anon, authenticated;
grant select on public.profiles_public_view to anon, authenticated;
