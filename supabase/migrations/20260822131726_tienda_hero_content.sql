-- Cabecera editable de la página de tienda (textos, ventajas, CTA y colores).

INSERT INTO public.site_content (key, title, content)
SELECT
  'tienda_hero',
  'Hero de la tienda',
  '{"eyebrow":"Tienda oficial","headline":"Herramientas y productos premium para unas cejas impecables","description":"Descubre la colección profesional de Shenna Brows. Productos diseñados para ofrecer precisión, control y resultados perfectos en cada aplicación.","features":[{"icon":"shield-check","label":"Calidad profesional"},{"icon":"truck","label":"Envío rápido 24/72h"},{"icon":"sparkles","label":"Resultados de precisión"}],"ctaText":"Comprar ahora","ctaHref":"#productos","accentColor":"#C5A059","headlineColor":"#1A1A1A","descriptionColor":"#1A1A1AB3","featureColor":"#1A1A1AB3","ctaBg":"#C5A059","ctaTextColor":"#FFFFFF"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'tienda_hero'
);
