-- Botón flotante de WhatsApp editable (número, mensaje, colores y visibilidad).

INSERT INTO public.site_content (key, title, content)
SELECT
  'whatsapp_button',
  'Botón de WhatsApp',
  '{"enabled":true,"phone":"34633979945","message":"","background":"#E9808E","iconColor":"#FFFFFF"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'whatsapp_button'
);
