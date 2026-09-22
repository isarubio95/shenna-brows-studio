-- Vídeos explicativos opcionales por ficha de producto.
--
-- En ordenador se apilan a la izquierda de la descripción y en móvil salen en un
-- carrusel debajo de «Envío». Cada entrada guarda el título que se pinta debajo
-- del vídeo, la URL en el bucket `product-images` y la proporción del archivo,
-- que sirve para reservar el hueco antes de que cargue.
alter table public.products
  add column if not exists feature_videos jsonb not null default '[]'::jsonb;

comment on column public.products.feature_videos is
  'Array JSON de vídeos de la ficha: [{ "id", "title", "videoUrl", "aspectRatio" }]. Vacío = la ficha no muestra vídeos.';
