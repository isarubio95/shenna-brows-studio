-- Marca explícita de pack para la sección "Packs" en /tienda (panel admin).
alter table public.products
  add column if not exists is_pack boolean not null default false;

comment on column public.products.is_pack is 'Si es true, el producto se lista en la sección Packs destacados de la tienda.';
