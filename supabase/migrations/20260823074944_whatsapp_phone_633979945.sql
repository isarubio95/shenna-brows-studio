-- Actualiza el número del botón flotante de WhatsApp (633 97 99 45 → +34 633979945).

UPDATE public.site_content
SET
  content = jsonb_set(
    COALESCE(NULLIF(trim(content), '')::jsonb, '{}'::jsonb),
    '{phone}',
    '"34633979945"'
  )::text,
  title = 'Botón de WhatsApp'
WHERE key = 'whatsapp_button';

INSERT INTO public.site_content (key, title, content)
SELECT
  'whatsapp_button',
  'Botón de WhatsApp',
  '{"enabled":true,"phone":"34633979945","message":"","background":"#E9808E","iconColor":"#FFFFFF"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'whatsapp_button'
);
