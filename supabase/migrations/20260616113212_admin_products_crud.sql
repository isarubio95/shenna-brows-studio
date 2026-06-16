-- Permite a administradores crear, editar y eliminar productos desde el panel Admin.

alter table public.products enable row level security;

drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products"
  on public.products
  for select
  to public
  using (true);

drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products"
  on public.products
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins update products" on public.products;
create policy "Admins update products"
  on public.products
  for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products"
  on public.products
  for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- Bucket de imágenes de producto (lectura pública; escritura para usuarios autenticados).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "Authenticated upload product images" on storage.objects;
create policy "Authenticated upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated update product images" on storage.objects;
create policy "Authenticated update product images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated delete product images" on storage.objects;
create policy "Authenticated delete product images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images');
