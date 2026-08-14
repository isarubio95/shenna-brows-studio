-- Hero editable del inicio (contenido precargado con assets actuales).

INSERT INTO public.site_content (key, title, content)
SELECT
  'index_hero',
  'Hero del inicio',
  '{"desktopImageUrl":"/hero/hero-lg.jpg","mobileImageUrl":"/hero/hero-sm.jpg","line1":"La precisión","line2":"Que te define","line2Accent":"define","headlineColor":"#F7F0E2","headlineAccentColor":"#F7F0E2","ctaText":"DESCUBRIR LA COLECCIÓN","ctaHref":"/tienda","ctaBg":"#F7F2E6","ctaTextColor":"#8F7F5D","alt":"Shenna Brows","textPosX":5,"textPosY":42}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'index_hero'
);
