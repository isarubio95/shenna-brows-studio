-- Lista objetos de los buckets de media para el panel de administración
-- (nombre, tamaño, fecha, mime). `storage.objects` no es accesible vía RLS
-- desde el cliente, así que se necesita una función SECURITY DEFINER que
-- compruebe el rol admin (mismo patrón que `get_storage_usage_bytes`).

create or replace function public.list_storage_objects()
returns table (
  bucket_id text,
  name text,
  created_at timestamptz,
  updated_at timestamptz,
  size_bytes bigint,
  mime_type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'not authorized';
  end if;

  return query
  select
    o.bucket_id,
    o.name,
    o.created_at,
    o.updated_at,
    coalesce((o.metadata->>'size')::bigint, 0),
    coalesce(o.metadata->>'mimetype', '')
  from storage.objects o
  where o.bucket_id in ('product-images', 'campaign-images')
  order by o.created_at desc;
end;
$$;

grant execute on function public.list_storage_objects() to authenticated;
