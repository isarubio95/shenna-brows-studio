-- Textos y estilo de la marquesina bajo el hero (inicio)
INSERT INTO public.site_content (key, title, content)
SELECT
  'index_marquee',
  'Marquesina del inicio',
  '{"items":["PARA MICROPIGMENTACIÓN","MOUSSE LIMPIADORA","HERRAMIENTAS ARTESANALES GOLD EDITION","FÓRMULAS DISEÑADAS PARA CEJAS","RUTINA COMPLETA","SHENNA"],"background":"#F8F3EB","paddingY":26}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'index_marquee'
);
