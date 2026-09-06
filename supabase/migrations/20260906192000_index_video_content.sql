-- Vídeo editable del inicio (debajo de la marquesina).

INSERT INTO public.site_content (key, title, content)
SELECT
  'index_video',
  'Vídeo del inicio',
  '{"title":"Mira como realizo un tratamiento de cejas profesional para que puedas hacerlo en casa","accent":"tratamiento de cejas profesional","videoUrl":"/videos/cejas-tratamiento.mp4","posterUrl":"/videos/cejas-tratamiento-poster.jpg"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'index_video'
);
