-- Expone a los administradores el espacio total ocupado en Storage (suma de
-- todos los buckets), para mostrar una barra de uso en el panel de admin.
--
-- `storage.objects` no es accesible desde el cliente vía RLS, así que se
-- necesita una función SECURITY DEFINER que compruebe el rol admin por su
-- cuenta (mismo helper `has_role` que usan las políticas de productos).

create or replace function public.get_storage_usage_bytes()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  total_bytes bigint;
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'not authorized';
  end if;

  select coalesce(sum((metadata->>'size')::bigint), 0)
    into total_bytes
    from storage.objects;

  return total_bytes;
end;
$$;

grant execute on function public.get_storage_usage_bytes() to authenticated;
