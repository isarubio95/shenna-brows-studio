-- Badge de oferta editable (texto y colores) para fichas de producto.

INSERT INTO public.site_content (key, title, content)
SELECT
  'site_badges',
  'Badge de oferta',
  '{"sale":{"text":"Oferta","background":"#E9808E","textColor":"#FFFFFF"}}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'site_badges'
);
