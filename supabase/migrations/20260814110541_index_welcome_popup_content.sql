-- Popup de bienvenida editable (CMS site_content).

INSERT INTO public.site_content (key, title, content)
SELECT
  'index_welcome_popup',
  'Popup de bienvenida',
  '{"enabled":true,"imageUrl":"","eyebrow":"CONSIGUE","offerAmount":"10€","offerSuffix":"DE DESCUENTO","badgeText":"EN TU PRIMER PEDIDO","primaryCta":"LO QUIERO","secondaryCta":"NO, GRACIAS","emailTitle":"Recibe tu código","emailDescription":"Déjanos tu email y te enviamos el descuento de 10€ para tu primer pedido (mín. 50€).","emailCta":"Suscribirme","pink":"#E9808E","gold":"#C5A059","delayMs":1300,"alt":"Oferta de bienvenida Shenna Brows"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'index_welcome_popup'
);
