alter table public.products
  add column if not exists color_variants jsonb not null default '[]'::jsonb;

comment on column public.products.color_variants is
  'Array JSON de variantes de color: [{ "id", "name", "hex" }]. Hex en formato #RRGGBB.';
