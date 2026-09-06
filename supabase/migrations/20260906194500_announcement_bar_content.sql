-- Barra superior (marquesina de envíos) editable desde el panel admin.

INSERT INTO public.site_content (key, title, content)
SELECT
  'announcement_bar',
  'Barra superior',
  '{"enabled":true,"items":["Envíos gratis en pedidos superiores a 50 euros"],"background":"#000000","textColor":"#FFFFFF"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'announcement_bar'
);
