-- Campaña publicitaria del inicio (textos + URLs de imagen) y bucket de assets.

INSERT INTO public.site_content (key, title, content)
SELECT
  'index_campaign',
  'Campaña publicitaria',
  '{"desktopImageUrl":"","mobileImageUrl":"","headline":"MUCHO MÁS QUE UN PROTECTOR SOLAR","headlineColor":"#5C4A32","subheadline":"La protección que tu piel estaba esperando.","subheadlineAccent":"estaba esperando.","subheadlineColor":"#5C4A32","subheadlineAccentColor":"#C5A059","dividerColor":"#C5A059","alt":"Campaña publicitaria"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'index_campaign'
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

DROP POLICY IF EXISTS "Public read campaign images" ON storage.objects;
CREATE POLICY "Public read campaign images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'campaign-images');

DROP POLICY IF EXISTS "Authenticated upload campaign images" ON storage.objects;
CREATE POLICY "Authenticated upload campaign images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'campaign-images');

DROP POLICY IF EXISTS "Authenticated update campaign images" ON storage.objects;
CREATE POLICY "Authenticated update campaign images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'campaign-images')
  WITH CHECK (bucket_id = 'campaign-images');

DROP POLICY IF EXISTS "Authenticated delete campaign images" ON storage.objects;
CREATE POLICY "Authenticated delete campaign images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'campaign-images');
